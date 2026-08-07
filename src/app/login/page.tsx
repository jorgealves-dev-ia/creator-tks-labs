import type { Metadata } from "next";

import { t } from "@/lib/i18n/pt-BR";

import { LoginForm } from "./login-form";

// The root layout already appends "· Creator TKS Labs" via its title template.
export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const initialError =
    searchParams.erro === "confirmacao"
      ? t.auth.errors.confirmationFailed
      : undefined;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem]
                   -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-lg bg-accent
                       text-sm font-semibold text-white"
          >
            ⚡
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-ink">{t.app.name}</p>
            <p className="text-xs text-ink-faint">{t.app.tagline}</p>
          </div>
        </div>

        <LoginForm initialError={initialError} />
      </div>
    </main>
  );
}
