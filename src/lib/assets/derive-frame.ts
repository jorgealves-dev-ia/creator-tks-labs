import { registerDerivedFrame, findDerivedFrame } from "@/lib/assets/actions";
import { extractLastFrame, type LastFrameFailure } from "@/lib/assets/last-frame";
import { signAssets } from "@/lib/assets/sign-batch";
import { storeThumbnailInBrowser } from "@/lib/assets/thumbnail-client";
import { IMMUTABLE_CACHE_CONTROL } from "@/lib/assets/thumbnail-path";
import { eloPodeLerQuadro } from "@/lib/storyboard/machine-video";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * O ELO — o último quadro de um clipe virando asset, com linhagem.
 *
 * ---------------------------------------------------------------------------
 * Por que isto saiu de dentro do bloco Gerar Vídeo
 * ---------------------------------------------------------------------------
 *
 * Nasceu lá, no Ciclo 1, dentro de "Continuar deste vídeo". A Máquina do Ciclo 3
 * precisa exatamente do mesmo elo — a cena 2 emenda no clipe da 1 —, e a saída
 * óbvia (copiar os cinco passos) seria **duas maneiras de derivar o mesmo
 * quadro**: a segunda envelheceria calada no primeiro dia em que alguém
 * consertasse só uma.
 *
 * O que ficou no bloco foi o que é dele: pôr o par de nodes no canvas e levar a
 * tela até eles. O que veio para cá é o que é do produto: **de um clipe, um
 * quadro registrado**.
 *
 * ---------------------------------------------------------------------------
 * A ordem, e o que cada passo impede
 * ---------------------------------------------------------------------------
 *
 *   0. perguntar se o quadro já existe. Se existe, tudo entre 1 e 4 é trabalho
 *      para chegar num arquivo que já está lá — e trabalho que **exigiria aba
 *      visível**, porque passa pelo decodificador. É o passo que faz a cláusula
 *      da 0.3 quase nunca doer.
 *   1. assinar de novo, e não reusar o link que a lista trouxe. As URLs valem
 *      uma hora; um canvas aberto desde o almoço tem link morto, e a falha
 *      apareceria como "não consegui ler o vídeo" quando a causa é o relógio.
 *   2. ler o quadro no navegador, com o decodificador que já existe.
 *   3. subir ao Storage num caminho determinístico pelo id do vídeo — pedir duas
 *      vezes sobrescreve os mesmos bytes em vez de plantar um irmão.
 *   4. registrar com a linhagem, no servidor, que confere a posse e monta o
 *      rótulo pelo id (o navegador não nomeia nada).
 *
 * Nenhum passo chama modelo, toca o ledger ou cria linha em `generations`. **O
 * elo é de graça**, e é isso que faz uma cena de continuação não ter imagem
 * própria (D4).
 */

export type QuadroDerivado =
  | {
      ok: true;
      assetId: string;
      /**
       * Veio do passo zero?
       *
       * Interessa a quem chama por um motivo prático: se já existia, nada passou
       * pelo decodificador — então a aba podia estar escondida o tempo todo.
       */
      jaExistia: boolean;
    }
  | {
      ok: false;
      /**
       * `aba_escondida` é a cláusula da 0.3, e ela vive aqui — junto do
       * decodificador — em vez de em quem chama. Fosse decidida lá fora, quem
       * chamasse precisaria saber que o passo zero dispensa a aba, e essa é
       * justamente a regra que a função esconde de todo mundo.
       */
      reason: LastFrameFailure | "upload" | "not_a_video" | "aba_escondida";
    };

export async function garantirQuadroDerivado(
  clipAssetId: string,
  opcoes: { abaVisivel: boolean },
): Promise<QuadroDerivado> {
  // 0. Já lemos este vídeo antes? Uma consulta indexada, e ela poupa os quatro
  //    passos seguintes inteiros.
  const conhecido = await findDerivedFrame(clipAssetId);

  if (conhecido?.assetId) return { ok: true, assetId: conhecido.assetId, jaExistia: true };

  // A partir daqui passa pelo decodificador do navegador, e ele exige aba à
  // frente. Parar aqui com a causa nomeada é o que faz a cadeia pausar em vez de
  // girar — e o passo zero acima é o que faz isso quase nunca acontecer.
  const elo = eloPodeLerQuadro({ quadroJaExiste: false, abaVisivel: opcoes.abaVisivel });

  if (!elo.pode) return { ok: false, reason: elo.motivo };

  // 1. Link fresco, sempre.
  const urls = await signAssets([clipAssetId]);
  // `full`, e a distinção aqui vale dinheiro: estes pixels viram o primeiro
  // quadro do próximo clipe, numa geração paga. Miniatura é para olhar; isto é
  // matéria-prima.
  const fresco = urls[clipAssetId]?.full;

  if (!fresco) return { ok: false, reason: "expired_link" };

  // 2. O quadro.
  const lido = await extractLastFrame(fresco);

  if (!lido.ok) return { ok: false, reason: lido.reason };

  // 3. O Storage. O caminho diz o que o arquivo é — o último quadro **deste**
  //    vídeo —, e é por ser determinístico que uma segunda leitura sobrescreve
  //    em vez de duplicar.
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) return { ok: false, reason: "upload" };

  const storagePath = `${userId}/frames/${clipAssetId}-ultimo.png`;

  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(storagePath, lido.frame.blob, {
      contentType: "image/png",
      cacheControl: IMMUTABLE_CACHE_CONTROL,
      upsert: true,
    });

  if (uploadError) return { ok: false, reason: "upload" };

  // 3b. A miniatura do quadro. Ele é um PNG de ~1,2 MB que vira card no canvas —
  //     mesma regra de todo o resto, e best-effort como todo o resto: falhar
  //     aqui não pode custar o quadro que já está no Storage.
  await storeThumbnailInBrowser(storagePath, lido.frame.blob);

  // 4. A escrituração, com a linhagem.
  const registrado = await registerDerivedFrame({
    storagePath,
    sourceAssetId: clipAssetId,
    atMs: lido.frame.atMs,
    width: lido.frame.width,
    height: lido.frame.height,
    byteSize: lido.frame.blob.size,
  });

  if (!registrado.ok) {
    return { ok: false, reason: registrado.reason === "not_a_video" ? "not_a_video" : "upload" };
  }

  return { ok: true, assetId: registrado.assetId, jaExistia: false };
}
