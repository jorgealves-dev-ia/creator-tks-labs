import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

/**
 * A MONTAGEM — de N clipes pagos, UM arquivo, sem gastar nada.
 *
 * ---------------------------------------------------------------------------
 * Por que ela existe, e por que é o rabo do Ciclo 3
 * ---------------------------------------------------------------------------
 *
 * O veredito do dono, em 02/09/2026, depois de percorrer a régua do zero: *"o
 * fluxo ficou curto, mas para antes do fim — três «vídeo pronto» e nenhum
 * vídeo."* Três clipes numa pasta são matéria-prima; **um filme é entrega.**
 *
 * ---------------------------------------------------------------------------
 * Ela REMUXA, não recodifica — e a diferença se mede
 * ---------------------------------------------------------------------------
 *
 * Copia os pacotes **já comprimidos** de N MP4 para um MP4 só, deslocando o
 * relógio. Nenhum quadro é decodificado, nenhum é recomprimido: o filme **é** os
 * clipes. A Fase 0 provou isso do jeito duro — os 363 quadros do montado são
 * idênticos, por hash de pixel cru, aos 363 das três cenas na ordem certa.
 *
 * Recodificar encolheria o arquivo 3× (11,1 MB → 3,7 MB) e custaria 13× mais
 * tempo, perdendo qualidade. Ficou como plano B, não como padrão.
 *
 * ---------------------------------------------------------------------------
 * UMA função nossa na frente do motor
 * ---------------------------------------------------------------------------
 *
 * Todo o produto entra por `montarVideo`. Isso é decisão, e é a que torna o
 * plano B barato: se a `mediabunny` sumir amanhã, trocar o motor é reescrever
 * **esta** função — não caçar chamadas espalhadas pelo código.
 *
 * ---------------------------------------------------------------------------
 * A TRAVA é nossa, e ela lê os ARQUIVOS
 * ---------------------------------------------------------------------------
 *
 * Dois achados medidos da Fase 0, e os dois moram aqui:
 *
 *   1. **O banco não sabe o que os arquivos são.** `assets.width`/`height` são
 *      `NULL` nos clipes, e `generations.params.resolution` diz `"720p"` para um
 *      arquivo que tem **716×1284** — porque aquilo é o *pedido feito à fal*, não
 *      a medida. Um portão que decida *"dá para juntar?"* pelo banco decide pelo
 *      dado errado.
 *
 *   2. **Nenhuma biblioteca recusa clipe incompatível sozinha.** O `ffmpeg -c
 *      copy` entrega arquivo **silenciosamente errado** (18,896 s onde deviam ser
 *      15,118 s); o puro JS acerta a duração e **declara a resolução do primeiro
 *      clipe para todos**. As duas falham caladas, de maneiras diferentes.
 *
 * Por isso a recusa **nomeia o clipe que destoa**: *"não deu para montar"*
 * mandaria a pessoa adivinhar qual dos dez. E ler três cabeçalhos de MP4 não
 * chama ninguém e não gasta Spark — **recusar custa zero.**
 *
 * ---------------------------------------------------------------------------
 * Montagem NÃO é geração
 * ---------------------------------------------------------------------------
 *
 * Nada aqui chama modelo, cria linha em `generations`, toca o ledger ou cobra
 * Spark. É a mesma natureza do quadro derivado do elo. *Se um dia montagem
 * passar a custar, ela vira geração e volta para a régua do dinheiro.*
 */

/**
 * O que faz dois clipes juntáveis sem recodificar.
 *
 * É a chave da Fase 0 traduzida para o que a `mediabunny` sabe ler. `codec` vem
 * do **decoder config**, não do nome curto: ali dentro está o perfil e o nível
 * (`avc1.4d401f`), que é exatamente o que muda quando alguém troca o modelo de
 * vídeo e os arquivos param de emendar.
 */
export type Assinatura = {
  codec: string;
  largura: number;
  altura: number;
  /** Quadros por segundo, medido nos pacotes — não declarado por ninguém. */
  fps: number;
  temAudio: boolean;
  audioCodec: string | null;
};

export type ClipeLido = {
  /** 1..N, na ordem em que o chamador entregou — que é a ordem das cenas. */
  posicao: number;
  /** Como este clipe se chama para a pessoa: "cena 2". Vai na recusa. */
  rotulo: string;
  assinatura: Assinatura;
  duracaoSegundos: number;
  quadros: number;
};

export type RecusaDeMontagem =
  /** Nada para montar. O portão não deveria ter deixado chegar aqui. */
  | { motivo: "sem_clipes" }
  /**
   * A soma dos bytes estoura o teto do bucket, e **a recusa traz o número**.
   *
   * Vem antes de tudo de propósito: é a única pergunta que se responde sem abrir
   * arquivo nenhum, então é a mais barata — e negar cedo poupa baixar 50 MB para
   * concluir o óbvio.
   */
  | { motivo: "excede_o_bucket"; bytes: number; limite: number }
  | { motivo: "clipe_ilegivel"; posicao: number; rotulo: string; detalhe: string }
  | { motivo: "sem_trilha_de_video"; posicao: number; rotulo: string }
  /**
   * O clipe destoa dos outros. `diferencas` diz **em quê** — sem isso a pessoa
   * sabe que falhou e não sabe o que consertar.
   */
  | {
      motivo: "assinatura_destoante";
      posicao: number;
      rotulo: string;
      esperada: Assinatura;
      achada: Assinatura;
      diferencas: string[];
    };

export type Montado = {
  arquivo: Uint8Array;
  /**
   * Os quatro números MEDIDOS do arquivo montado.
   *
   * Eles existem para o asset do filme nascer sabendo o que é. Os clipes de
   * vídeo têm `assets.width`/`height` em `NULL` — o filme **não pode** nascer com
   * o mesmo defeito, porque ele é a coisa que a pessoa vai baixar e postar, e
   * porque um asset que não sabe as próprias dimensões obriga todo consumidor a
   * abrir o arquivo para descobrir. A montagem já leu estes quatro para decidir
   * se podia montar: gravá-los custa **zero a mais**.
   */
  largura: number;
  altura: number;
  fps: number;
  duracaoSegundos: number;
  quadros: number;
  /** O que entrou, na ordem — vira a linhagem em `asset_montage_parts`. */
  clipes: ClipeLido[];
  /** Quanto tempo a montagem levou, para o registro continuar tendo números. */
  ms: number;
};

/**
 * Um clipe para montar: **bytes**, nunca um objeto da biblioteca.
 *
 * Isto é fronteira, e é decisão. Se quem chama tivesse de construir um `Source`
 * da `mediabunny`, a promessa de *"uma função nossa na frente do motor"* já
 * estaria furada no primeiro chamador — trocar a biblioteca passaria a exigir
 * mexer na rota, no harness e em quem mais tivesse encostado nela. Com bytes na
 * fronteira, o produto inteiro não sabe que a `mediabunny` existe.
 *
 * *E foi um harness que provou a necessidade disto, não um argumento:* com
 * `Source` na assinatura, o script de prova instanciava a cópia **dele** da
 * biblioteca e o módulo usava a **do repositório** — duas cópias, `instanceof`
 * falhando, e a recusa saindo como `clipe_ilegivel` para um clipe perfeitamente
 * legível.
 */
export type EntradaDeMontagem = {
  rotulo: string;
  arquivo: Uint8Array;
};

/**
 * Teto do bucket `assets`, em bytes.
 *
 * **É configuração nossa, não do Supabase** —
 * `supabase/migrations/20260807140500_storage_assets_bucket.sql:11`, posto para
 * bater com o teto do plano Free, com o comentário *"Raise it when the plan
 * changes"*. A 3.688.819 B por cena de 5 s, o teto teórico é **14 cenas**; o
 * `TETO_CENAS = 10` de hoje passa com **30% de folga** (35,0 MB medidos).
 *
 * O gate existe **agora**, com o teto folgado, e não no dia em que apertar.
 */
export const TETO_DO_BUCKET_BYTES = 52_428_800;

/** Duas medidas de fps iguais na prática. Pacote não dá número redondo. */
const TOLERANCIA_FPS = 0.05;

/**
 * Cabe no bucket? — a pergunta que se responde **sem baixar nada**.
 *
 * Existe separada de `montarVideo` de propósito: quem chama tem os tamanhos em
 * `assets.byte_size` **antes** de pedir um byte ao Storage, e negar ali poupa
 * baixar 50 MB para concluir o óbvio. A `montarVideo` refaz a conta com os bytes
 * de verdade — é de graça, e cobre o dia em que o banco e o arquivo discordarem.
 */
export function cabeNoBucket(
  bytesDeclarados: readonly number[],
  limite: number = TETO_DO_BUCKET_BYTES,
): { cabe: true } | { cabe: false; recusa: RecusaDeMontagem } {
  const bytes = bytesDeclarados.reduce((soma, b) => soma + b, 0);

  return bytes > limite
    ? { cabe: false, recusa: { motivo: "excede_o_bucket", bytes, limite } }
    : { cabe: true };
}

function mesmaAssinatura(a: Assinatura, b: Assinatura): string[] {
  const diferencas: string[] = [];

  if (a.codec !== b.codec) diferencas.push(`codec ${b.codec} ≠ ${a.codec}`);
  if (a.largura !== b.largura || a.altura !== b.altura) {
    diferencas.push(`resolução ${b.largura}×${b.altura} ≠ ${a.largura}×${a.altura}`);
  }
  if (Math.abs(a.fps - b.fps) > TOLERANCIA_FPS) {
    diferencas.push(`fps ${b.fps.toFixed(2)} ≠ ${a.fps.toFixed(2)}`);
  }
  if (a.temAudio !== b.temAudio) {
    diferencas.push(b.temAudio ? "tem áudio, e o primeiro não tem" : "não tem áudio, e o primeiro tem");
  } else if (a.temAudio && a.audioCodec !== b.audioCodec) {
    diferencas.push(`áudio ${b.audioCodec} ≠ ${a.audioCodec}`);
  }

  return diferencas;
}

/**
 * O que um clipe É — lido do arquivo, nunca do banco.
 *
 * Exportada porque o portão da tela precisa da mesma leitura para dizer, **antes
 * do clique**, que um clipe destoa. Uma segunda leitura escrita à parte
 * envelheceria calada no primeiro dia em que alguém consertasse só uma.
 */
/**
 * Os bytes viram fonte aqui dentro, e só aqui — é o único ponto do produto que
 * sabe o nome de uma classe da biblioteca.
 */
function fonteDe(entrada: EntradaDeMontagem): BlobSource {
  return new BlobSource(new Blob([entrada.arquivo as unknown as BlobPart]));
}

export async function lerClipe(
  entrada: EntradaDeMontagem,
  posicao: number,
): Promise<{ ok: true; clipe: ClipeLido } | { ok: false; recusa: RecusaDeMontagem }> {
  try {
    const input = new Input({ source: fonteDe(entrada), formats: ALL_FORMATS });
    const video = await input.getPrimaryVideoTrack();

    if (!video) {
      return { ok: false, recusa: { motivo: "sem_trilha_de_video", posicao, rotulo: entrada.rotulo } };
    }

    const audio = await input.getPrimaryAudioTrack();
    const config = await video.getDecoderConfig();
    const stats = await video.computePacketStats();

    return {
      ok: true,
      clipe: {
        posicao,
        rotulo: entrada.rotulo,
        assinatura: {
          codec: config?.codec ?? video.codec ?? "desconhecido",
          largura: video.codedWidth,
          altura: video.codedHeight,
          fps: stats.averagePacketRate,
          temAudio: audio !== null,
          audioCodec: audio?.codec ?? null,
        },
        duracaoSegundos: await video.computeDuration(),
        quadros: stats.packetCount,
      },
    };
  } catch (erro) {
    return {
      ok: false,
      recusa: {
        motivo: "clipe_ilegivel",
        posicao,
        rotulo: entrada.rotulo,
        detalhe: erro instanceof Error ? erro.message : String(erro),
      },
    };
  }
}

/**
 * Monta, ou recusa dizendo qual clipe estragou a festa.
 *
 * **A ordem é a do array**, e quem chama é responsável por ela ter vindo de
 * `storyboard_scenes.ordem` — nunca de `created_at` nem do nome do arquivo. A
 * Fase 0 mediu por quê: o lote de 643 ms de 02/09 submeteu as três cenas fora de
 * ordem, e a cena 2 é a geração criada **por último**. Montar por hora de criação
 * entrega o filme embaralhado, **e o erro não aparece em teste nenhum que não
 * assista ao vídeo** — o arquivo é válido, tem a duração certa e o número certo
 * de quadros.
 */
export async function montarVideo(
  entradas: readonly EntradaDeMontagem[],
  opcoes: { limiteDeBytes?: number } = {},
): Promise<{ ok: true; montado: Montado } | { ok: false; recusa: RecusaDeMontagem }> {
  const limite = opcoes.limiteDeBytes ?? TETO_DO_BUCKET_BYTES;

  if (entradas.length === 0) return { ok: false, recusa: { motivo: "sem_clipes" } };

  // 1 · A pergunta mais barata primeiro: cabe no bucket? Nenhum arquivo aberto.
  //     Quem chama já devia ter perguntado com `cabeNoBucket` antes de baixar —
  //     aqui a conta é refeita com os bytes de verdade, que é o que decide.
  const coube = cabeNoBucket(entradas.map((e) => e.arquivo.byteLength), limite);
  if (!coube.cabe) return { ok: false, recusa: coube.recusa };

  // 2 · O que cada um É. Todos, antes de montar qualquer coisa — recusar depois
  //     de escrever metade do arquivo seria gastar para descobrir o mesmo.
  const clipes: ClipeLido[] = [];
  for (const [i, entrada] of entradas.entries()) {
    const lido = await lerClipe(entrada, i + 1);
    if (!lido.ok) return { ok: false, recusa: lido.recusa };
    clipes.push(lido.clipe);
  }

  // 3 · A TRAVA. O primeiro clipe define a assinatura, e os outros têm de
  //     bater — é o que nenhuma das duas bibliotecas faz sozinha.
  const referencia = clipes[0]!.assinatura;
  for (const clipe of clipes.slice(1)) {
    const diferencas = mesmaAssinatura(referencia, clipe.assinatura);
    if (diferencas.length > 0) {
      return {
        ok: false,
        recusa: {
          motivo: "assinatura_destoante",
          posicao: clipe.posicao,
          rotulo: clipe.rotulo,
          esperada: referencia,
          achada: clipe.assinatura,
          diferencas,
        },
      };
    }
  }

  // 4 · A montagem. Daqui para baixo é o motor, e é só isto que muda se um dia
  //     a biblioteca for trocada.
  const t0 = performance.now();
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  let fonteVideo: EncodedVideoPacketSource | null = null;
  let fonteAudio: EncodedAudioPacketSource | null = null;
  let deslocamento = 0;
  let quadros = 0;

  for (const entrada of entradas) {
    const input = new Input({ source: fonteDe(entrada), formats: ALL_FORMATS });
    const video = await input.getPrimaryVideoTrack();
    // A leitura do passo 2 já garantiu que existe; o `if` é para o TypeScript.
    if (!video) continue;

    const audio = await input.getPrimaryAudioTrack();
    const configVideo = await video.getDecoderConfig();
    const configAudio = audio ? await audio.getDecoderConfig() : null;

    if (!fonteVideo) {
      fonteVideo = new EncodedVideoPacketSource(video.codec!);
      output.addVideoTrack(fonteVideo);
      if (audio) {
        fonteAudio = new EncodedAudioPacketSource(audio.codec!);
        output.addAudioTrack(fonteAudio);
      }
      await output.start();
    }

    // O relógio de cada clipe recomeça do zero; o deslocamento é o que os
    // enfileira em vez de empilhá-los no mesmo instante.
    let fim = 0;
    let primeiro = true;

    for await (const pacote of new EncodedPacketSink(video).packets()) {
      await fonteVideo.add(
        new EncodedPacket(
          pacote.data,
          pacote.type,
          pacote.timestamp + deslocamento,
          pacote.duration,
          pacote.sequenceNumber,
        ),
        primeiro && configVideo ? { decoderConfig: configVideo } : undefined,
      );
      primeiro = false;
      quadros += 1;
      fim = Math.max(fim, pacote.timestamp + pacote.duration);
    }

    if (audio && fonteAudio) {
      let primeiroAudio = true;
      for await (const pacote of new EncodedPacketSink(audio).packets()) {
        await fonteAudio.add(
          new EncodedPacket(
            pacote.data,
            pacote.type,
            pacote.timestamp + deslocamento,
            pacote.duration,
            pacote.sequenceNumber,
          ),
          primeiroAudio && configAudio ? { decoderConfig: configAudio } : undefined,
        );
        primeiroAudio = false;
        fim = Math.max(fim, pacote.timestamp + pacote.duration);
      }
    }

    deslocamento += fim;
  }

  fonteVideo?.close();
  fonteAudio?.close();
  await output.finalize();

  const arquivo = output.target.buffer;
  if (!arquivo) {
    return {
      ok: false,
      recusa: { motivo: "clipe_ilegivel", posicao: 0, rotulo: "montagem", detalhe: "o alvo voltou vazio" },
    };
  }

  return {
    ok: true,
    montado: {
      arquivo: new Uint8Array(arquivo),
      // Medidos, e não herdados: os clipes já foram conferidos como uma
      // assinatura só no passo 3, então a do primeiro É a do filme — mas a
      // duração e os quadros são a SOMA, e é por isso que eles são contados aqui
      // em vez de copiados de lá.
      largura: referencia.largura,
      altura: referencia.altura,
      fps: referencia.fps,
      duracaoSegundos: deslocamento,
      quadros,
      clipes,
      ms: Math.round(performance.now() - t0),
    },
  };
}
