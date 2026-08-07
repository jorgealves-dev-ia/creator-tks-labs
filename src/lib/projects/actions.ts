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

export async function createProject(): Promise<void> {
  const { supabase, userId } = await requireSession();

  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("archived_at", null);

  const position = count ?? 0;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: `${t.studio.untitledProject} ${position + 1}`,
      sort_order: position,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Não foi possível criar o projeto.");
  }

  // The workflow row is created by a database trigger, so the canvas is ready
  // as soon as this redirect lands.
  revalidatePath("/");
  redirect(`/?p=${data.id}`);
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

  revalidatePath("/");
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

  revalidatePath("/");
  redirect(remaining ? `/?p=${remaining.id}` : "/");
}
