"use client";

import { useActionState, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { authenticate } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";
import { t } from "@/lib/i18n/pt-BR";

type Mode = "signin" | "signup";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<Mode>("signin");

  return (
    <ModeForm
      // Remounting on mode change resets the action state, so errors from the
      // previous mode do not linger on the new form.
      key={mode}
      mode={mode}
      initialError={mode === "signin" ? initialError : undefined}
      onSwitchMode={() => setMode(mode === "signin" ? "signup" : "signin")}
    />
  );
}

function ModeForm({
  mode,
  initialError,
  onSwitchMode,
}: {
  mode: Mode;
  initialError?: string;
  onSwitchMode: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    authenticate,
    initialAuthFormState,
  );
  const fieldId = useId();
  const isSignUp = mode === "signup";

  if (state.status === "check-email") {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <h2 className="text-base font-medium text-ink">
          {t.auth.checkEmailTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-muted">
          {t.auth.checkEmailBody}
        </p>
      </div>
    );
  }

  const generalError = state.message ?? initialError;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          {isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isSignUp ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="mode" value={mode} />

        {isSignUp ? (
          <Field
            id={`${fieldId}-name`}
            name="displayName"
            label={t.auth.displayNameLabel}
            placeholder={t.auth.displayNamePlaceholder}
            autoComplete="name"
            error={state.fieldErrors?.displayName}
          />
        ) : null}

        <Field
          id={`${fieldId}-email`}
          name="email"
          type="email"
          label={t.auth.emailLabel}
          placeholder={t.auth.emailPlaceholder}
          autoComplete="email"
          error={state.fieldErrors?.email}
        />

        <Field
          id={`${fieldId}-password`}
          name="password"
          type="password"
          label={t.auth.passwordLabel}
          placeholder={t.auth.passwordPlaceholder}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          error={state.fieldErrors?.password}
        />

        <p aria-live="polite" className="min-h-5 text-sm text-negative">
          {generalError}
        </p>

        <Button type="submit" disabled={pending} className="h-10 w-full">
          {pending
            ? t.auth.submitting
            : isSignUp
              ? t.auth.signUpAction
              : t.auth.signInAction}
        </Button>
      </form>

      <Button
        variant="ghost"
        onClick={onSwitchMode}
        className="mt-4 h-9 w-full text-xs"
      >
        {isSignUp ? t.auth.toSignIn : t.auth.toSignUp}
      </Button>
    </>
  );
}

function Field({
  id,
  label,
  error,
  ...inputProps
}: {
  id: string;
  label: string;
  error?: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-10 rounded-lg border border-line bg-surface px-3 text-sm text-ink
                   placeholder:text-ink-faint focus:border-accent focus:outline-none
                   aria-invalid:border-negative"
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-xs text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
