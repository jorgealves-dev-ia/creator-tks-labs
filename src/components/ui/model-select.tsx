"use client";

import type { ExtractionProviderOption } from "@/lib/extraction/actions";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The model selector, as a reusable primitive (spec §4.5). Extraction is its
 * first consumer; the generation nodes will be the next, which is why it lives in
 * ui/ and knows nothing about character sheets.
 *
 * A provider without a key is shown, not hidden: the user should be able to see
 * that OpenAI and Google exist and are one key away, instead of wondering why the
 * list is so short. Greyed out is the platform's own `disabled` on an option —
 * unselectable, visibly inert, and it needs no explaining beyond the tooltip.
 */

type ModelSelectProps = {
  id: string;
  providers: readonly ExtractionProviderOption[];
  value: string | null;
  onChange: (modelId: string) => void;
  disabled?: boolean;
};

export function ModelSelect({ id, providers, value, onChange, disabled }: ModelSelectProps) {
  return (
    <select
      id={id}
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm
                 text-ink transition-colors hover:border-line-strong
                 focus:border-accent focus:outline-none
                 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {value === null ? <option value="">{t.characterSheet.extraction.modelPlaceholder}</option> : null}

      {providers.map((provider) => (
        <optgroup key={provider.slug} label={labelFor(provider)}>
          {provider.models.map((model) => (
            <option
              key={model.id}
              value={model.id}
              disabled={provider.status !== "ready"}
              title={tooltipFor(provider)}
            >
              {model.displayName} · {model.sparks} ⚡
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

/**
 * The heading of a provider that cannot be used says *why* it cannot: a missing
 * key is something the user can fix today, a missing adapter is something only we
 * can. Telling someone to configure a key they already configured — which is what
 * a single "unusable" state would do — is worse than saying nothing.
 */
function labelFor(provider: ExtractionProviderOption): string {
  const extraction = t.characterSheet.extraction;

  if (provider.status === "ready") return provider.displayName;

  return provider.status === "missing_key"
    ? `${provider.displayName} ${extraction.missingKeySuffix}`
    : `${provider.displayName} ${extraction.noAdapterSuffix}`;
}

function tooltipFor(provider: ExtractionProviderOption): string | undefined {
  const extraction = t.characterSheet.extraction;

  if (provider.status === "ready") return undefined;

  return provider.status === "missing_key"
    ? extraction.missingKeyTooltip
    : extraction.noAdapterTooltip;
}

/**
 * The model the selector should open on: the catalogue's default among the
 * providers that can actually run, or the first usable one. Returns null when
 * nothing is usable, which is what makes the panel able to say so instead of
 * offering a button that could only fail.
 */
export function defaultModelId(providers: readonly ExtractionProviderOption[]): string | null {
  const usable = providers.filter((provider) => provider.status === "ready");

  for (const provider of usable) {
    const preferred = provider.models.find((model) => model.isDefault);
    if (preferred) return preferred.id;
  }

  return usable[0]?.models[0]?.id ?? null;
}

/** The price of one model, for the cost confirmation. */
export function findModel(providers: readonly ExtractionProviderOption[], modelId: string | null) {
  if (!modelId) return null;

  for (const provider of providers) {
    const model = provider.models.find((entry) => entry.id === modelId);
    if (model) return model;
  }

  return null;
}
