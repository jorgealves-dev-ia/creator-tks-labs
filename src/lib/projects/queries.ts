import { signWithThumbnails } from "@/lib/assets/signing";
import { createSupabaseServerClient } from "@/lib/supabase/server";


/**
 * Um projeto como o dashboard precisa dele.
 *
 * Nada aqui é conceito novo do banco: é a mesma linha de `projects` que as abas
 * sempre mostraram, acompanhada de três respostas que o usuário faz ao olhar um
 * cartão — "o que saiu daqui?", "quem trabalha aqui?" e "quando mexi nisto pela
 * última vez?".
 */
export type ProjectCard = {
  id: string;
  name: string;
  /** A geração bem-sucedida mais recente. `null` quando o projeto ainda não gerou nada. */
  coverUrl: string | null;
  /**
   * Quantas personagens trabalham aqui — e **só as que a pessoa consegue ver**.
   *
   * `project_entities` sozinho contava a mais: um vínculo continua existindo
   * depois que a personagem é arquivada, de propósito (ver `loadProjectCharacterIds`
   * — o vínculo não deixa de ser verdadeiro só porque ela saiu do Arsenal).
   * Medido neste banco: sete vínculos e seis personagens visíveis, porque
   * "Natany" está arquivada. O cartão diria 7 e o trilho do projeto mostraria 6.
   *
   * O filtro é o mesmo de `loadCharacters`, e essa é a regra: **o número no
   * cartão conta o que a tela mostra.** Foi o que decidiu "imagens e não
   * tentativas" logo acima, e vale igual aqui.
   */
  characterCount: number;
  /**
   * Quantas **imagens** saíram daqui — sucessos com arquivo, e não tentativas.
   *
   * É de propósito o mesmo recorte da Galeria do projeto (`listProjectGallery`):
   * o número do cartão e a quantidade de miniaturas da galeria têm que ser o
   * mesmo número. Contar tentativas faria o cartão dizer 47 e a galeria mostrar
   * 30, e a diferença — falhas e recusas — não é coisa que se conte como acervo.
   */
  imageCount: number;
  /** ISO. O maior entre salvar o canvas, gerar e nascer — ver `lastActivityOf`. */
  lastActivityAt: string;
};

/**
 * Os cartões do dashboard, numa leva só.
 *
 * Quatro consultas e uma assinatura de URLs, **independente de quantos projetos
 * existam** — a alternativa natural (uma consulta por cartão para contar, outra
 * para a capa) cresce com a lista e transforma uma tela inicial em dez viagens
 * ao banco.
 *
 * O preço dessa escolha está em `generations`: ela é lida inteira, do usuário,
 * com quatro colunas pequenas, para ser agrupada aqui. Isso é barato numa conta
 * com dezenas ou milhares de gerações e deixa de ser numa com centenas de
 * milhares — e nesse dia a resposta é uma view (ou uma RPC) que agrupe no banco,
 * não mais uma consulta aqui. Fica escrito para não ser redescoberto sob pressão.
 */
export async function loadProjectCards(userId: string): Promise<ProjectCard[]> {
  const supabase = await createSupabaseServerClient();

  const [projectsResult, workflowsResult, linksResult, visibleResult, generationsResult] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, name, created_at")
        .eq("user_id", userId)
        .is("archived_at", null)
        .order("sort_order")
        .order("created_at"),
      supabase.from("workflows").select("project_id, updated_at").eq("user_id", userId),
      supabase.from("project_entities").select("project_id, entity_id").eq("user_id", userId),
      // As personagens que a pessoa enxerga — o mesmo recorte de `loadCharacters`,
      // porque é com o trilho do canvas que o número do cartão precisa concordar.
      supabase
        .from("entities")
        .select("id")
        .eq("user_id", userId)
        .eq("kind", "character")
        .is("archived_at", null),
      supabase
        .from("generations")
        .select("project_id, created_at, status, result_asset_id")
        .eq("user_id", userId)
        .not("project_id", "is", null)
        .order("created_at", { ascending: false }),
    ]);

  const projects = projectsResult.data ?? [];

  if (projects.length === 0) return [];

  const canvasSavedAt = new Map(
    (workflowsResult.data ?? []).map((row) => [row.project_id, row.updated_at]),
  );

  const visibleCharacters = new Set((visibleResult.data ?? []).map((row) => row.id));

  const characterCounts = new Map<string, number>();
  for (const link of linksResult.data ?? []) {
    if (!visibleCharacters.has(link.entity_id)) continue;

    characterCounts.set(link.project_id, (characterCounts.get(link.project_id) ?? 0) + 1);
  }

  const imageCounts = new Map<string, number>();
  const lastGenerationAt = new Map<string, string>();
  const coverAssetId = new Map<string, string>();

  // As gerações chegam da mais recente para a mais antiga, então a **primeira**
  // que se vê de cada projeto é a última que aconteceu. É o que faz um só passo
  // responder as três perguntas sem reordenar nada.
  for (const generation of generationsResult.data ?? []) {
    const projectId = generation.project_id;

    if (projectId === null) continue;

    if (!lastGenerationAt.has(projectId)) {
      lastGenerationAt.set(projectId, generation.created_at);
    }

    if (generation.status !== "succeeded" || generation.result_asset_id === null) {
      continue;
    }

    imageCounts.set(projectId, (imageCounts.get(projectId) ?? 0) + 1);

    if (!coverAssetId.has(projectId)) {
      coverAssetId.set(projectId, generation.result_asset_id);
    }
  }

  const coverUrls = await signCovers(supabase, [...coverAssetId.values()]);

  return projects.map((project) => {
    const assetId = coverAssetId.get(project.id);

    return {
      id: project.id,
      name: project.name,
      coverUrl: (assetId && coverUrls.get(assetId)) ?? null,
      characterCount: characterCounts.get(project.id) ?? 0,
      imageCount: imageCounts.get(project.id) ?? 0,
      lastActivityAt: lastActivityOf({
        createdAt: project.created_at,
        canvasSavedAt: canvasSavedAt.get(project.id),
        lastGenerationAt: lastGenerationAt.get(project.id),
      }),
    };
  });
}

/**
 * Quando este projeto teve atividade pela última vez.
 *
 * **Não é `projects.updated_at`, e essa é a parte que importa.** Aquela coluna só
 * se move quando a linha do projeto muda — renomear, mudar de status —, e nem
 * gerar nem mexer no canvas a tocam. Medido neste banco em 12/08/2026: a última
 * geração era de 01:28 e o último salvamento do canvas de 02:04, enquanto o
 * `updated_at` do projeto marcava 19:03 **do dia anterior**. Um cartão que
 * lesse dali mentiria em seis horas, com cara de verdade.
 *
 * Os três sinais, e o maior deles vence:
 *  - **salvar o canvas** (`workflows.updated_at`) — arrumar os blocos é trabalho,
 *    e neste banco é justamente o sinal mais recente;
 *  - **gerar** (`generations.created_at`);
 *  - **nascer** (`projects.created_at`), que é o piso e o que responde por um
 *    projeto criado e nunca aberto.
 */
function lastActivityOf(input: {
  createdAt: string;
  canvasSavedAt: string | undefined;
  lastGenerationAt: string | undefined;
}): string {
  const candidates = [input.createdAt, input.canvasSavedAt, input.lastGenerationAt].filter(
    (value): value is string => value !== undefined,
  );

  return candidates.reduce((latest, value) => (value > latest ? value : latest));
}

/** Os links das capas, numa requisição só ao Storage. */
async function signCovers(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  assetIds: readonly string[],
): Promise<Map<string, string>> {
  if (assetIds.length === 0) return new Map();

  const { data: assets } = await supabase
    .from("assets")
    .select("id, storage_path")
    .in("id", assetIds);

  if (!assets || assets.length === 0) return new Map();

  // Capa de cartão é miniatura: ninguém amplia a capa, ela leva ao projeto.
  const signed = await signWithThumbnails(
    supabase,
    assets.map((asset) => asset.storage_path),
  );

  // Uma capa que sumiu do Storage simplesmente não vira URL, e o cartão cai no
  // estado vazio — que é uma tela honesta, e não uma moldura quebrada.
  return new Map(
    assets.flatMap((asset) => {
      const pair = signed.get(asset.storage_path);
      return pair ? [[asset.id, pair.thumb] as const] : [];
    }),
  );
}
