import "server-only";

import { thumbnailPath } from "./thumbnail-path";

/**
 * Assinar original e miniatura juntos — a viagem que as telas todas fazem.
 *
 * ---------------------------------------------------------------------------
 * Por que os dois sempre, e nunca só um
 * ---------------------------------------------------------------------------
 *
 * A regra da faxina: **grade, faixa e card leem `thumb`; clique, zoom e download
 * leem `full`.** Quem chama escolhe na hora de desenhar, sem uma segunda ida ao
 * servidor — e sem que a existência da miniatura vire uma pergunta que cada tela
 * tenha que fazer por conta própria.
 *
 * Custa zero a mais: `createSignedUrls` já aceita uma lista e responde **por
 * caminho**, com `signedUrl: null` para o que não existe. Dobrar a lista dobra
 * bytes de JSON, não requisições — e é isso que dispensa a coluna `has_thumbnail`
 * que teria sido a alternativa. **O Storage é a autoridade sobre o que está no
 * Storage**, e um booleano no banco só poderia discordar dele.
 *
 * ---------------------------------------------------------------------------
 * `thumb` nunca é nulo
 * ---------------------------------------------------------------------------
 *
 * Sem miniatura — arquivo anterior ao backfill, derivado que falhou —, `thumb`
 * vem com o endereço do **original**. O requisito "miniatura que falha não
 * bloqueia nada" vira assim uma propriedade da **forma da resposta**, e não um
 * `if` que quatro telas precisam lembrar de escrever. A imagem aparece igual;
 * só o peso muda.
 */

export type SignedAsset = {
  /** O original. O zoom abre este, o download entrega este. */
  full: string;
  /** A miniatura — ou o original, quando ela ainda não existe. */
  thumb: string;
};

type StorageClient = {
  storage: {
    from: (bucket: string) => {
      createSignedUrls: (
        paths: string[],
        expiresIn: number,
      ) => Promise<{ data: { path?: string | null; signedUrl: string | null }[] | null }>;
    };
  };
};

/**
 * Devolve, por caminho de original, o par assinado.
 *
 * Um caminho cujo **original** não assinou simplesmente não entra no mapa: o
 * arquivo sumiu do Storage, e uma tela não tem o que fazer com ele. É a mesma
 * decisão que a faixa de resultados já tomava — *"uma imagem que sumiu não entra
 * na faixa; a miniatura existe para ser clicada, e essa não pode ser."*
 */
export async function signWithThumbnails(
  supabase: StorageClient,
  paths: readonly string[],
  expiresIn: number,
): Promise<Map<string, SignedAsset>> {
  if (paths.length === 0) return new Map();

  const { data } = await supabase.storage
    .from("assets")
    .createSignedUrls(
      paths.flatMap((path) => [path, thumbnailPath(path)]),
      expiresIn,
    );

  const byPath = new Map<string, string>();

  for (const entry of data ?? []) {
    if (entry.path && typeof entry.signedUrl === "string") byPath.set(entry.path, entry.signedUrl);
  }

  const result = new Map<string, SignedAsset>();

  for (const path of paths) {
    const full = byPath.get(path);

    if (!full) continue;

    result.set(path, { full, thumb: byPath.get(thumbnailPath(path)) ?? full });
  }

  return result;
}
