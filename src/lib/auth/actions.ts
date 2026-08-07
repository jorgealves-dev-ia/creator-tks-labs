"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { AuthFormState } from "@/lib/auth/form-state";
import { t } from "@/lib/i18n/pt-BR";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.email({ error: t.auth.errors.invalidEmail }).trim(),
  password: z.string().min(8, { error: t.auth.errors.passwordTooShort }),
});

const signUpSchema = credentialsSchema.extend({
  displayName: z
    .string()
    .trim()
    .min(2, { error: t.auth.errors.displayNameTooShort })
    .max(60),
});

/**
 * Turns Supabase's English error strings into copy a user can act on.
 * Anything unrecognised falls back to a generic message rather than leaking
 * provider internals to the screen.
 */
function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return t.auth.errors.invalidCredentials;
  }
  if (normalized.includes("email not confirmed")) {
    return t.auth.errors.emailNotConfirmed;
  }
  if (normalized.includes("already registered")) {
    return t.auth.errors.emailAlreadyRegistered;
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return t.auth.errors.rateLimited;
  }
  return t.auth.errors.unexpected;
}

/** Origin of the current request, so confirmation links come back here. */
async function siteOrigin(): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  return `${protocol}://${host}`;
}

type FieldErrors = Partial<Record<"email" | "password" | "displayName", string[]>>;

function firstMessages(fieldErrors: FieldErrors): AuthFormState["fieldErrors"] {
  return {
    email: fieldErrors.email?.[0],
    password: fieldErrors.password?.[0],
    displayName: fieldErrors.displayName?.[0],
  };
}

/**
 * Single entry point for the login screen: the form carries a `mode` field so
 * both paths share one `useActionState` hook.
 */
export async function authenticate(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const mode = formData.get("mode");

  return mode === "signup" ? signUp(formData) : signIn(formData);
}

async function signIn(formData: FormData): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: firstMessages(z.flattenError(parsed.error).fieldErrors),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { status: "error", message: translateAuthError(error.message) };
  }

  // Outside any try/catch: redirect() signals navigation by throwing.
  revalidatePath("/", "layout");
  redirect("/");
}

async function signUp(formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    displayName: formData.get("displayName"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: firstMessages(z.flattenError(parsed.error).fieldErrors),
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
      data: { display_name: parsed.data.displayName },
    },
  });

  if (error) {
    return { status: "error", message: translateAuthError(error.message) };
  }

  // No session means the project requires e-mail confirmation.
  if (!data.session) {
    return { status: "check-email" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
