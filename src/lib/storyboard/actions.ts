"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { loadCatalog } from "@/lib/ai/catalog";
import type { CatalogProvider } from "@/lib/ai/catalog-types";
import {
  CANAL_KEYS,
  ENQUADRAMENTO_KEYS,
  TETO_CENAS,
  TRANSICAO_KEYS,
  type Canal,
  type Cena,
  type Historia,
} from "@/lib/storyboard/contract";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * O que a tela do Roteiro lê e escreve — FRENTE STORYBOARD · CICLO 2 · Fase 3.
 *
 * ---------------------------------------------------------------------------
 * Três leituras e uma escrita, e nenhuma delas gera nada
 * ---------------------------------------------------------------------------
 *
 * Este arquivo é deliberadamente o **lado barato** do bloco de Roteiro: o
 * catálogo, o roteiro gravado, a biblioteca de CTA e a edição à mão de uma ficha.
 * Nada aqui chama modelo, toca o ledger ou escreve em `generations` — quem faz
 * isso é `lib/storyboard/generate.ts`, atrás da rota, com a ordem de segurança
 * inteira.
 *
 * A separação não é organização: é a diferença entre um caminho que pode custar
 * e um que não pode. Um deles precisa ser lido com atenção antes de cada
 * mudança; o outro precisa apenas estar certo.
 *
 * ---------------------------------------------------------------------------
 * Por que a edição à mão é Server Action e não escrita direta do navegador
 * ---------------------------------------------------------------------------
 *
 * O RLS permitiria o navegador escrever direto em `storyboard_scenes` — as
 * políticas de UPDATE existem e escopam por dono. O que ele **não** faz é
 * garantir que os campos cheguem na forma que a tabela espera: `transicao` fora
 * da lista, `duracao_segundos` em zero ou uma cena 1 marcada como continuação
 * seriam recusados por CHECK, com uma mensagem de Postgres que ninguém consegue
 * mostrar a um usuário.
 *
 * Passando por aqui, o Zod recusa antes com o campo culpado nomeado — a mesma
 * doutrina de `parseCena`, um degrau acima. E o `edited_at` é carimbado **no
 * servidor**: quem edita não decide quando editou.
 */

// ---------------------------------------------------------------------------
// O catálogo
// ---------------------------------------------------------------------------

/**
 * Os fornecedores e modelos que sabem **escrever**, com o preço de cada trabalho.
 *
 * Irmã de `listImageProviders` e `listVideoProviders`, e a diferença está na
 * lista que vem junto: `jobs`, com `roteiro`, `estruturar` e `cena` ao preço do
 * catálogo. É dela que o bloco lê o número que diz antes do clique — e é por ela
 * viajar que a tela nunca precisa saber quanto custa nada.
 */
export async function listTextProviders(): Promise<CatalogProvider[]> {
  const { supabase } = await requireSession();

  return loadCatalog(supabase, "text_gen");
}

// ---------------------------------------------------------------------------
// O roteiro gravado
// ---------------------------------------------------------------------------

/** Uma ficha como a tela a vê: a cena do contrato, mais o que só o banco sabe. */
export type SceneRow = Cena & {
  status: "rascunho" | "aprovada";
  /**
   * Quando uma pessoa mexeu nesta ficha. Nulo = como a máquina escreveu.
   *
   * Viaja para a tela porque é a única coisa que distingue uma ficha que alguém
   * revisou de uma que ninguém leu — e num trilho de dez linhas iguais, essa é a
   * informação que decide onde a atenção vai.
   */
  editedAt: string | null;
};

export type NodeStoryboard = {
  id: string;
  /** A ideia CONGELADA que produziu estas fichas — não a que está no node agora. */
  ideia: string;
  canal: Canal;
  historia: Historia;
  cenas: SceneRow[];
  /**
   * Houve condensação? **A conta, nunca a frase.**
   *
   * Feita aqui e não na tela por um motivo de fronteira: quem lê a coluna é este
   * arquivo, e devolver `cenas_no_original` cru convidaria cada componente que
   * um dia mostrar isso a refazer a comparação do seu jeito. Uma conta, um lugar.
   *
   * `historia.ajuste` continua indo junto, e continua sendo **ilustração**: a
   * tela só o mostra quando este booleano já disse que houve condensação. É o
   * defeito medido na Fase 0 — *"Condensado de 6 para 6 cenas"* sobre um roteiro
   * intacto — barrado na única camada em que ele ainda podia passar.
   */
  condensou: boolean;
};

const nodeSchema = z.object({
  projectId: z.uuid(),
  nodeId: z.string().min(1).max(200),
});

/**
 * O roteiro deste node, ou nulo.
 *
 * Achado por `(project_id, node_id)` — o padrão do bloco de vídeo, e a razão de
 * o node não guardar id nenhum: não existe segunda cópia para discordar do banco
 * depois de um reload. O RLS escopa ao dono, então um par que não é seu
 * simplesmente não encontra nada.
 */
export async function loadNodeStoryboard(input: unknown): Promise<NodeStoryboard | null> {
  const parsed = nodeSchema.safeParse(input);

  if (!parsed.success) return null;

  const { supabase } = await requireSession();

  const { data: row } = await supabase
    .from("storyboards")
    .select(
      "id, ideia, canal, titulo, formato, estilo, genero, cenas_no_original, ajuste, storyboard_scenes (ordem, acao, personagem_handle, produto, cenario, enquadramento, movimento, fala, cta_id, cta_texto, duracao_segundos, transicao, status, edited_at)",
    )
    .eq("project_id", parsed.data.projectId)
    .eq("node_id", parsed.data.nodeId)
    .maybeSingle();

  if (!row) return null;

  const cenas: SceneRow[] = [...row.storyboard_scenes]
    .sort((a, b) => a.ordem - b.ordem)
    .map((cena) => ({
      ordem: cena.ordem,
      acao: cena.acao,
      personagem: cena.personagem_handle,
      produto: cena.produto,
      cenario: cena.cenario,
      enquadramento: cena.enquadramento as Cena["enquadramento"],
      movimento: cena.movimento,
      fala: cena.fala,
      cta_id: cena.cta_id,
      cta_texto: cena.cta_texto,
      duracao_segundos: cena.duracao_segundos,
      transicao: cena.transicao as Cena["transicao"],
      status: cena.status === "aprovada" ? "aprovada" : "rascunho",
      editedAt: cena.edited_at,
    }));

  const historia: Historia = {
    titulo: row.titulo,
    formato: row.formato as Historia["formato"],
    estilo: row.estilo as Historia["estilo"],
    genero: row.genero,
    cenas_no_original: row.cenas_no_original,
    ajuste: row.ajuste,
  };

  return {
    id: row.id,
    ideia: row.ideia,
    canal: row.canal as Canal,
    historia,
    cenas,
    condensou: row.cenas_no_original !== null && row.cenas_no_original > cenas.length,
  };
}

// ---------------------------------------------------------------------------
// A biblioteca de CTA
// ---------------------------------------------------------------------------

/** Uma sugestão de CTA, na forma que o dropdown mostra. */
export type CtaOption = {
  id: string;
  textoPt: string;
  /** Quando usar, em uma frase. "A tela é o manual" aplicado a um catálogo. */
  hint: string | null;
};

/**
 * As chamadas para ação **deste canal**.
 *
 * A mesma consulta que o motor faz para montar a receita, e de propósito: o que
 * o modelo recebe como sugestão e o que a pessoa vê no dropdown têm de ser a
 * mesma lista. Duas leituras com dois filtros seriam duas bibliotecas — e a
 * divergência apareceria como "o roteiro usou um CTA que não está na lista".
 *
 * Lista vazia é caso legítimo, não erro: o dropdown continua oferecendo
 * "escrever um próprio", que é o que a receita já faz do outro lado.
 */
export async function listCtas(input: unknown): Promise<CtaOption[]> {
  const parsed = z.enum(CANAL_KEYS).safeParse(input);

  if (!parsed.success) return [];

  const { supabase } = await requireSession();

  const { data } = await supabase
    .from("cta_library")
    .select("id, texto_pt, hint")
    .eq("canal", parsed.data)
    .eq("momento", "cta")
    .eq("enabled", true)
    .order("sort_order");

  return (data ?? []).map((row) => ({ id: row.id, textoPt: row.texto_pt, hint: row.hint }));
}

// ---------------------------------------------------------------------------
// A edição à mão
// ---------------------------------------------------------------------------

/**
 * O que uma pessoa pode reescrever numa ficha, e o que ela não pode.
 *
 * **`personagem` está fora, e é escolha.** O campo guarda um handle, e um campo
 * de texto livre para handle é um convite a escrever `@lunna` — que gravaria sem
 * reclamar (não há FK) e só falharia lá na frente, quando a ficha virasse
 * imagem e o `@` não resolvesse. Quem decide de quem é o roteiro é a
 * configuração do bloco, onde a lista é fechada e o erro é impossível.
 *
 * **`ordem` também está fora**, e por outro motivo: mudar a ordem de uma ficha é
 * reordenar o roteiro, que é gesto do Ciclo 3 — e é para ele que o unique nasceu
 * `deferrable`.
 */
const scenePatchSchema = z.object({
  acao: z.string().min(1).max(2000),
  cenario: z.string().min(1).max(500),
  enquadramento: z.enum(ENQUADRAMENTO_KEYS),
  movimento: z.string().max(500),
  fala: z.string().max(2000).nullable(),
  produto: z.string().max(200).nullable(),
  ctaId: z.string().max(48).nullable(),
  ctaTexto: z.string().max(500).nullable(),
  duracaoSegundos: z.number().int().min(1).max(60),
  transicao: z.enum(TRANSICAO_KEYS),
  status: z.enum(["rascunho", "aprovada"]),
});

const saveSceneSchema = z
  .object({
    projectId: z.uuid(),
    nodeId: z.string().min(1).max(200),
    ordem: z.number().int().min(1).max(TETO_CENAS),
    patch: scenePatchSchema,
  })
  /**
   * A cena 1 não pode virar continuação por edição manual.
   *
   * A trava existe no banco (`storyboard_scenes_primeira_nao_continua`) e no Zod
   * do contrato, e faltava exatamente neste caminho — que é o único em que um
   * humano escolhe a transição. Sem esta linha, a recusa viria do Postgres, com
   * o nome de uma constraint na tela e a edição inteira perdida.
   */
  .refine((input) => !(input.ordem === 1 && input.patch.transicao === "continuacao"), {
    message: "a cena 1 não pode ser continuação — não há quadro anterior",
    path: ["patch", "transicao"],
  });

export type SaveSceneResult =
  | { ok: true; editedAt: string }
  | { ok: false; reason: "invalid" | "not_found" | "error" };

/**
 * Uma ficha reescrita à mão — e a única escrita deste arquivo.
 *
 * Não cobra nada, não cria linha em `generations` e não encosta no ledger:
 * **editar não é gerar**, e a tela tem de deixar isso óbvio porque os dois gestos
 * moram no mesmo overlay, a três centímetros um do outro.
 *
 * `edited_at` é carimbado aqui, com o relógio do banco (`now()` via
 * `new Date().toISOString()` seria o relógio de quem chamou). É a coluna que a
 * confirmação de "gerar de novo" vai contar em voz alta antes de substituir — e
 * uma coluna de auditoria com a hora do cliente não audita nada.
 */
export async function saveScene(input: unknown): Promise<SaveSceneResult> {
  const parsed = saveSceneSchema.safeParse(input);

  if (!parsed.success) return { ok: false, reason: "invalid" };

  const { supabase, userId } = await requireSession();
  const { projectId, nodeId, ordem, patch } = parsed.data;

  // O storyboard primeiro, para a atualização ser escopada por ele e não por um
  // id que veio do navegador. O RLS já escoparia por dono; isto escopa por
  // **node**, que é o que impede uma ficha do bloco ao lado de ser reescrita por
  // um pedido com o número certo e o node errado.
  const { data: storyboard } = await supabase
    .from("storyboards")
    .select("id")
    .eq("project_id", projectId)
    .eq("node_id", nodeId)
    .maybeSingle();

  if (!storyboard) return { ok: false, reason: "not_found" };

  const editedAt = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("storyboard_scenes")
    .update({
      acao: patch.acao.trim(),
      cenario: patch.cenario.trim(),
      enquadramento: patch.enquadramento,
      movimento: patch.movimento.trim(),
      fala: emptyToNull(patch.fala),
      produto: emptyToNull(patch.produto),
      cta_id: emptyToNull(patch.ctaId),
      cta_texto: emptyToNull(patch.ctaTexto),
      duracao_segundos: patch.duracaoSegundos,
      transicao: patch.transicao,
      status: patch.status,
      edited_at: editedAt,
    })
    .eq("storyboard_id", storyboard.id)
    .eq("ordem", ordem)
    .eq("user_id", userId)
    .select("edited_at")
    .maybeSingle();

  if (error) return { ok: false, reason: "error" };
  if (!updated) return { ok: false, reason: "not_found" };

  return { ok: true, editedAt: updated.edited_at ?? editedAt };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Texto em branco vira nulo antes de descer.
 *
 * `fala`, `produto` e os dois campos de CTA são anuláveis de propósito, e a
 * diferença importa: nulo é "não há", string vazia é "há, e é nada". Um textarea
 * esvaziado tem de virar o primeiro — senão a ficha passa a dizer que tem uma
 * fala, e a voz de amanhã vai tentar dublar o silêncio.
 */
function emptyToNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";

  return trimmed === "" ? null : trimmed;
}

async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return { supabase, userId };
}
