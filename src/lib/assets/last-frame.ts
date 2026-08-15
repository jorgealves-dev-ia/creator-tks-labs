"use client";

/**
 * O último quadro de um vídeo, lido no navegador — o elo entre um capítulo e o
 * seguinte.
 *
 * ---------------------------------------------------------------------------
 * Por que no cliente, e não no servidor — medido antes de escrito
 * ---------------------------------------------------------------------------
 *
 * O último quadro de um H.264 **não é um keyframe**: não existe "pegar sem
 * decodificar", nem aqui nem lá. A diferença é onde mora o decodificador.
 *
 * No navegador ele já existe: é o `<video>`, e custa zero. No servidor custaria
 * `@ffmpeg-installer/linux-x64` — **68 MB medidos** dos 250 MB de bundle da
 * Vercel, uma dependência nova, e o download dos 4 MB do vídeo para dentro da
 * função a cada quadro. Para um trabalho de meio segundo que o cliente já sabe
 * fazer.
 *
 * ---------------------------------------------------------------------------
 * `crossOrigin = "anonymous"` é obrigatório, e isso foi provado pelo contrário
 * ---------------------------------------------------------------------------
 *
 * As URLs assinadas do nosso Storage devolvem `Access-Control-Allow-Origin: *`
 * — conferido no protocolo, inclusive no preflight. **E isso sozinho não
 * basta.** Sem o atributo abaixo o navegador nem manda `Origin`, trata a
 * resposta como opaca e contamina o canvas; `toBlob` estoura com
 * `SecurityError: Tainted canvases may not be exported`.
 *
 * Foi assim que a investigação de 15/08/2026 leu o veredito: o mesmo vídeo, na
 * mesma página, com o atributo → canvas limpo; sem o atributo → SecurityError.
 * O que prova o caminho feliz é o caminho triste ao lado.
 *
 * ---------------------------------------------------------------------------
 * A aba escondida não decodifica — e por isso isto é gesto, nunca trabalho de fundo
 * ---------------------------------------------------------------------------
 *
 * Medido oito vezes: numa aba com `visibilityState === "hidden"` o `<video>`
 * emite `stalled` aos ~3 s e **nunca** chega a `loadedmetadata`, enquanto um
 * `fetch()` dos mesmos bytes volta em 4 ms. Vale para `preload="metadata"` e
 * `"auto"`, para blob URL local e até com `play()` — não é rede, é a pilha de
 * mídia do navegador.
 *
 * A consequência está no produto: extrair é ato de quem está olhando. Não
 * existe "extrai sozinho quando o vídeo termina", e quando a leitura falha por
 * este motivo a tela diz **isso**, em vez de girar para sempre.
 */

/** O que sai de uma leitura bem-sucedida. */
export type LastFrame = {
  /** PNG, sempre. Ver a nota de formato no fim deste arquivo. */
  blob: Blob;
  width: number;
  height: number;
  /**
   * Em que instante o quadro foi lido de verdade — não o que foi pedido.
   *
   * É este número que vai para `assets.derived_from_ms`, e é a diferença entre
   * o registro dizer um fato conferível e dizer uma afirmação.
   */
  atMs: number;
};

export type LastFrameFailure =
  /** A aba não estava visível. O caso medido, e o único com conserto óbvio. */
  | "hidden_tab"
  /** O link assinado morreu (uma hora de validade) ou o arquivo sumiu. */
  | "expired_link"
  /** O navegador não decodifica este arquivo. */
  | "undecodable"
  /** O canvas contaminou. Não deveria acontecer — se acontecer, quero saber. */
  | "tainted"
  | "error";

export type LastFrameResult =
  | { ok: true; frame: LastFrame }
  | { ok: false; reason: LastFrameFailure };

/**
 * Quinze segundos, e não cinco.
 *
 * A primeira leitura de um vídeo numa aba recém-aberta chegou a levar mais de
 * dez segundos na medição, com o decodificador frio; as seguintes levaram
 * milissegundos. Um limite curto transformaria "está demorando" em "falhou".
 */
const MEDIA_TIMEOUT_MS = 15_000;

/**
 * O recuo de segurança, usado **só** se pedir o fim exato não render quadro.
 *
 * No Chrome não é preciso: pedir `currentTime = duration` trava no último
 * quadro decodificável, e o resultado é byte a byte idêntico ao de 40 ms antes
 * — conferido por SHA-256 na investigação. Outros navegadores podem recortar
 * diferente, e é para eles que esta linha existe.
 */
const SAFETY_STEP_SECONDS = 0.05;

export async function extractLastFrame(url: string): Promise<LastFrameResult> {
  const video = document.createElement("video");

  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;

  try {
    video.src = url;

    if (!(await settle(video, "loadedmetadata"))) {
      return { ok: false, reason: diagnose(video) };
    }

    const duration = video.duration;

    if (!Number.isFinite(duration) || duration <= 0) {
      return { ok: false, reason: "undecodable" };
    }

    const canvas = document.createElement("canvas");

    // As dimensões vêm do próprio vídeo, e é isto que cumpre "resolução fiel à
    // origem". O catálogo diz `720p`, mas `720p` é o **nível do endpoint** e não
    // a contagem de pixels: o clipe medido saiu 960×960. Quem assumisse
    // 1280×720 entregaria um quadro esticado.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context || canvas.width === 0 || canvas.height === 0) {
      return { ok: false, reason: "undecodable" };
    }

    for (const target of [duration, Math.max(0, duration - SAFETY_STEP_SECONDS)]) {
      video.currentTime = target;

      if (!(await settle(video, "seeked"))) {
        return { ok: false, reason: diagnose(video) };
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Um canvas em que nada foi desenhado é **transparente**; um quadro
      // desenhado é opaco, mesmo quando é preto. Testar a opacidade em vez do
      // brilho é o que permite distinguir "não desenhou" de "o vídeo termina
      // escuro" — e um fim escuro é um quadro legítimo, não uma falha.
      let painted: boolean;

      try {
        painted = isOpaque(context, canvas.width, canvas.height);
      } catch {
        // `getImageData` num canvas contaminado estoura aqui, antes do toBlob.
        return { ok: false, reason: "tainted" };
      }

      if (!painted) continue;

      const blob = await toPng(canvas);

      if (!blob) return { ok: false, reason: "tainted" };

      return {
        ok: true,
        frame: {
          blob,
          width: canvas.width,
          height: canvas.height,
          atMs: Math.round(video.currentTime * 1000),
        },
      };
    }

    return { ok: false, reason: "undecodable" };
  } catch {
    return { ok: false, reason: "error" };
  } finally {
    // Solta o decodificador. Sem isto, um canvas onde alguém clicou dez vezes
    // acumula dez elementos de mídia vivos, e o décimo primeiro não carrega.
    video.removeAttribute("src");
    video.load();
  }
}

/**
 * Espera um evento do elemento de mídia, ou desiste.
 *
 * Devolve `false` tanto no erro quanto no tempo esgotado, de propósito: quem
 * distingue os dois é `diagnose`, que sabe olhar o `video.error` e a
 * visibilidade da aba. Duas respostas aqui seriam a mesma pergunta feita duas
 * vezes.
 */
function settle(video: HTMLVideoElement, event: "loadedmetadata" | "seeked"): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (value: boolean) => {
      video.removeEventListener(event, ok);
      video.removeEventListener("error", fail);
      clearTimeout(timer);
      resolve(value);
    };

    const ok = () => done(true);
    const fail = () => done(false);
    const timer = setTimeout(() => done(false), MEDIA_TIMEOUT_MS);

    video.addEventListener(event, ok, { once: true });
    video.addEventListener("error", fail, { once: true });
  });
}

/**
 * Por que a leitura não aconteceu — e a primeira pergunta é a aba.
 *
 * A ordem importa: uma aba escondida nunca chega a produzir `video.error`, ela
 * simplesmente não avança. Perguntar pelo erro primeiro devolveria "error"
 * genérico justamente no caso que tem conserto de um clique.
 */
function diagnose(video: HTMLVideoElement): LastFrameFailure {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") {
    return "hidden_tab";
  }

  switch (video.error?.code) {
    case MediaError.MEDIA_ERR_NETWORK:
      return "expired_link";
    case MediaError.MEDIA_ERR_DECODE:
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      return "undecodable";
    default:
      return "error";
  }
}

/** Quatro cantos e o centro bastam: `drawImage` pinta o quadro inteiro ou nada. */
function isOpaque(context: CanvasRenderingContext2D, width: number, height: number): boolean {
  const points: readonly [number, number][] = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), Math.floor(height / 2)],
  ];

  return points.some(([x, y]) => context.getImageData(x, y, 1, 1).data[3] === 255);
}

/**
 * PNG, e não JPEG — a escolha custa 1 MB e compra fidelidade.
 *
 * Medido no clipe real: PNG 1,18 MB contra JPEG q0,92 em 140 KB. O quadro vai
 * ser o **primeiro frame do próximo clipe**, ou seja, entra numa geração paga
 * como referência de identidade. Ele já carrega a compressão do H.264; somar
 * uma segunda geração de perda em cima de um rosto é exatamente o que este
 * produto existe para recusar. Storage é custo nosso e é desprezível.
 */
function toPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch {
      resolve(null);
    }
  });
}
