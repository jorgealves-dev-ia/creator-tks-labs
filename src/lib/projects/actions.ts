"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { t } from "@/lib/i18n/pt-BR";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const projectIdSchema = z.uuid();
const projectNameSchema = z.string().trim().min(1).max(80);

/**
 * Every action re-verifies the session server-side. The proxy already blocks
 * anonymous requests, but a Server Action is a public HTTP endpoint and must
 * not depend on that.
 */
async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  return { supabase, userId };
}

/**
 * As duas telas que mostram a lista de projetos, invalidadas juntas.
 *
 * Era uma só — `revalidatePath("/")` — enquanto o canvas era `/` e a lista de
 * projetos existia apenas como as abas do header dele. Desde 12/08/2026 a mesma
 * lista aparece em dois lugares: os cartões do dashboard (`/`) e as abas do
 * canvas (`/studio`). Criar, renomear ou excluir muda as duas, e invalidar
 * apenas a rota para onde o `redirect()` vai deixaria a outra servindo cache:
 * criar um projeto e voltar pela chama mostraria um dashboard sem ele.
 */
function revalidateProjectScreens() {
  revalidatePath("/");
  revalidatePath("/studio");
}

/**
 * The next "Projeto sem título N" — the highest number already used, plus one.
 *
 * Counting the projects instead was the bug: delete the middle tab of three and
 * the next new project is called "2" again, because there are two of them. The
 * database this was found on had a *single* project named "Projeto sem título
 * 2", which is the same arithmetic showing its other face.
 *
 * The highest rather than the lowest free number, deliberately: reusing the name
 * of a project somebody deleted this morning is how two different things end up
 * with one name in a screenshot, a note or a memory. Numbers only go up.
 *
 * Renamed projects are read too, and that is not an accident — if a tab is
 * called "Projeto sem título 7" today, nothing new may be born with that name,
 * whoever typed it.
 */
function nextUntitledName(names: readonly string[]): string {
  const prefix = `${t.studio.untitledProject} `;

  const highest = names.reduce((top, name) => {
    const trimmed = name.trim();

    if (!trimmed.startsWith(prefix)) return top;

    const suffix = trimmed.slice(prefix.length).trim();

    // Six digits is far past any real project list, and it is what keeps a
    // hand-typed "Projeto sem título 999999999999" from deciding the next name.
    if (!/^\d{1,6}$/.test(suffix)) return top;

    return Math.max(top, Number(suffix));
  }, 0);

  return `${prefix}${highest + 1}`;
}

export async function createProject(): Promise<void> {
  const { supabase, userId } = await requireSession();

  // Two different questions, and they were one before: where the tab goes, and
  // what it is called. Position is about the tabs on screen, so archived
  // projects are none of its business; the name has to be unique among every
  // project that has ever been named, which is why it reads them all.
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null);

  const { data: existing } = await supabase
    .from("projects")
    .select("name")
    .eq("user_id", userId);

  const position = count ?? 0;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: nextUntitledName((existing ?? []).map((project) => project.name)),
      sort_order: position,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Não foi possível criar o projeto.");
  }

  // The workflow row is created by a database trigger, so the canvas is ready
  // as soon as this redirect lands.
  revalidateProjectScreens();
  redirect(`/studio?p=${data.id}`);
}

export async function renameProject(formData: FormData): Promise<void> {
  const { supabase } = await requireSession();

  const id = projectIdSchema.safeParse(formData.get("projectId"));
  const name = projectNameSchema.safeParse(formData.get("name"));

  if (!id.success || !name.success) {
    return;
  }

  await supabase
    .from("projects")
    .update({ name: name.data })
    .eq("id", id.data);

  revalidateProjectScreens();
}

export async function deleteProject(formData: FormData): Promise<void> {
  const { supabase, userId } = await requireSession();

  const id = projectIdSchema.safeParse(formData.get("projectId"));

  if (!id.success) {
    return;
  }

  await supabase.from("projects").delete().eq("id", id.data);

  const { data: remaining } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("sort_order")
    .order("created_at")
    .limit(1)
    .maybeSingle();

  revalidateProjectScreens();
  // Sem projeto que sobre, o destino é o vestíbulo — que agora tem o que dizer
  // ("Nenhum projeto ainda" e o botão), em vez do canvas vazio de antes.
  redirect(remaining ? `/studio?p=${remaining.id}` : "/");
}
