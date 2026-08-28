"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { defaultModelId, findModel, ModelSelect } from "@/components/ui/model-select";
import { IMMUTABLE_CACHE_CONTROL } from "@/lib/assets/thumbnail-path";
import type { CharacterSheet } from "@/lib/character-sheet/schema";
import {
  getSparkBalance,
  listExtractionProviders,
  runExtraction,
  type ExtractionProviderOption,
  type ExtractionResult,
} from "@/lib/extraction/actions";
import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_SOURCE_TEXT_LENGTH,
} from "@/lib/extraction/contract";
import type { ExtractionSummary } from "@/lib/extraction/apply";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { t } from "@/lib/i18n/pt-BR";

/**
 * The extraction flow, spec §4.5: choose a source, choose a model, confirm the
 * cost, watch it work, read the tally.
 *
 * One component for both doors (decision E4) — step 2 of the wizard and the button
 * on the editor's DNA tab. Two copies of this screen would drift, and the second
 * one to drift would be the one that forgets to say the cost.
 *
 * The photo goes from the browser straight to Storage, as the canonical images
 * already do: the bucket policy pins every user to their own folder, and it is the
 * only path that is not capped by the 1 MB body limit of a Server Action.
 */

type Phase = "idle" | "uploading" | "analyzing" | "done";

type ExtractionPanelProps = {
  entityId: string;
  /** Applied server-side; the caller loads the returned sheet into its draft. */
  onApplied: (sheet: CharacterSheet, summary: ExtractionSummary) => void;
  /**
   * Flushes the pending autosave. The engine reads the *stored* draft, so
   * whatever the user typed in the last second has to land first — the same
   * reason "save as new version" flushes before photographing the draft.
   */
  flushDraft?: () => Promise<boolean>;
};

export function ExtractionPanel({ entityId, onApplied, flushDraft }: ExtractionPanelProps) {
  const reactId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [source, setSource] = useState<"photo" | "text">("photo");
  const [providers, setProviders] = useState<ExtractionProviderOption[]>([]);
  const [modelId, setModelId] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  /**
   * Where this exact file already lives in Storage.
   *
   * Retrying an analysis must not upload the same photo again: during a real
   * outage that produced one orphan per attempt. The path is remembered for as
   * long as the chosen file does not change, so a retry costs one API call and
   * nothing else. A failed extraction keeps pointing at it on purpose — it is
   * the evidence of what the engine was asked to read.
   */
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExtractionSummary | null>(null);
  const [charged, setCharged] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void Promise.all([listExtractionProviders(), getSparkBalance()]).then(
      ([loaded, sparks]) => {
        if (cancelled) return;

        setProviders(loaded);
        setModelId(defaultModelId(loaded));
        setBalance(sparks);
      },
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const model = findModel(providers, modelId);
  const busy = phase === "uploading" || phase === "analyzing";

  function chooseFile(chosen: File) {
    setError(null);

    if (!ACCEPTED_IMAGE_MIME_TYPES.some((accepted) => accepted === chosen.type)) {
      setError(t.characterSheet.extraction.errors.notAnImage);
      return;
    }

    if (chosen.size > MAX_IMAGE_BYTES) {
      setError(t.characterSheet.extraction.errors.tooLarge);
      return;
    }

    setFile(chosen);
    // A different file is a different upload.
    setUploadedPath(null);
  }

  async function run() {
    setError(null);

    if (!modelId) {
      setError(t.characterSheet.extraction.errors.noModel);
      return;
    }

    if (source === "photo" && !file) {
      setError(t.characterSheet.extraction.errors.noPhoto);
      return;
    }

    if (source === "text" && text.trim().length < 20) {
      setError(t.characterSheet.extraction.errors.noText);
      return;
    }

    if (flushDraft) {
      const flushed = await flushDraft();

      if (!flushed) {
        setError(t.characterSheet.extraction.errors.draftFailed);
        return;
      }
    }

    let result: ExtractionResult;

    if (source === "photo" && file) {
      let uploaded = uploadedPath;

      if (!uploaded) {
        setPhase("uploading");
        uploaded = await uploadReferencePhoto(entityId, file);

        if (!uploaded) {
          setPhase("idle");
          setError(t.characterSheet.extraction.errors.uploadFailed);
          return;
        }

        setUploadedPath(uploaded);
      }

      setPhase("analyzing");

      result = await runExtraction({
        source: "photo",
        entityId,
        modelId,
        storagePath: uploaded,
        mimeType: file.type,
        byteSize: file.size,
      });
    } else {
      setPhase("analyzing");

      result = await runExtraction({
        source: "text",
        entityId,
        modelId,
        text: text.trim(),
      });
    }

    if (!result.ok) {
      setPhase("idle");
      setError(messageFor(result));
      return;
    }

    setPhase("done");
    setSummary(result.summary);
    setCharged(result.sparksCharged);
    setBalance((current) => (current === null ? null : current - result.sparksCharged));
    onApplied(result.sheet, result.summary);
  }

  if (phase === "done" && summary) {
    return (
      <div className="mx-auto max-w-md py-2">
        <p className="text-sm font-medium text-ink">{summaryLine(summary)}</p>

        {summary.marcas > 0 ? (
          <p className="mt-1 text-xs text-ink-muted">
            {summary.marcas} {t.characterSheet.extraction.summary.marcas}
          </p>
        ) : null}

        <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
          {t.characterSheet.extraction.chargedPrefix} {charged} ⚡
          {balance === null ? null : ` · ${t.characterSheet.extraction.balancePrefix} ${balance} ⚡`}
        </p>

        <Button
          type="button"
          variant="ghost"
          className="mt-4 h-9 px-3"
          onClick={() => {
            setPhase("idle");
            setSummary(null);
            setFile(null);
            setUploadedPath(null);
            setText("");
          }}
        >
          {t.characterSheet.extraction.again}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-2">
      <p className="text-xs leading-relaxed text-ink-faint">
        {t.characterSheet.extraction.subtitle}
      </p>

      <div className="mt-4 flex gap-2">
        {(
          [
            ["photo", t.characterSheet.extraction.sourcePhoto],
            ["text", t.characterSheet.extraction.sourceText],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={source === id}
            disabled={busy}
            onClick={() => {
              setSource(id);
              setError(null);
            }}
            className={`flex-1 rounded-lg border px-3 py-2 text-xs transition-colors
                        disabled:cursor-not-allowed disabled:opacity-50 ${
                          source === id
                            ? "border-accent bg-accent-soft text-ink"
                            : "border-line text-ink-muted hover:border-line-strong hover:text-ink"
                        }`}
          >
            {label}
          </button>
        ))}
      </div>

      {source === "photo" ? (
        <div className="mt-4">
          <input
            ref={fileInputRef}
            id={`${reactId}-file`}
            type="file"
            accept={ACCEPTED_IMAGE_MIME_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => {
              const chosen = event.target.files?.[0];
              if (chosen) chooseFile(chosen);
              // Cleared so picking the same file twice still fires a change.
              event.target.value = "";
            }}
          />

          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            className="h-9 px-3"
            onClick={() => fileInputRef.current?.click()}
          >
            {file
              ? t.characterSheet.extraction.photoChange
              : t.characterSheet.extraction.photoChoose}
          </Button>

          {file ? <p className="mt-2 truncate text-xs text-ink-muted">{file.name}</p> : null}

          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
            {t.characterSheet.extraction.photoHint}
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <label htmlFor={`${reactId}-text`} className="sr-only">
            {t.characterSheet.extraction.sourceText}
          </label>
          <textarea
            id={`${reactId}-text`}
            rows={6}
            value={text}
            disabled={busy}
            maxLength={MAX_SOURCE_TEXT_LENGTH}
            placeholder={t.characterSheet.extraction.textPlaceholder}
            onChange={(event) => setText(event.target.value)}
            className="w-full resize-y rounded-lg border border-line bg-surface-raised px-3 py-2
                       font-mono text-xs text-ink placeholder:text-ink-faint
                       focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
            {t.characterSheet.extraction.textHint}
          </p>
        </div>
      )}

      <div className="mt-4">
        <label
          htmlFor={`${reactId}-model`}
          className="mb-1.5 block text-xs font-medium text-ink-muted"
        >
          {t.characterSheet.extraction.modelLabel}
        </label>
        <ModelSelect
          id={`${reactId}-model`}
          providers={providers}
          value={modelId}
          onChange={setModelId}
          disabled={busy}
        />
      </div>

      {model ? (
        <p className="mt-3 text-xs text-ink-muted">
          {t.characterSheet.extraction.costPrefix} <strong className="text-ink">{model.sparks} ⚡</strong>
          {balance === null ? null : (
            <span className="text-ink-faint">
              {" "}
              · {t.characterSheet.extraction.balancePrefix} {balance} ⚡
            </span>
          )}
        </p>
      ) : null}

      {error ? <p className="mt-3 text-xs leading-relaxed text-negative">{error}</p> : null}

      <div className="mt-5">
        <Button type="button" disabled={busy || !modelId} className="h-9 px-4" onClick={() => void run()}>
          {phase === "uploading"
            ? t.characterSheet.extraction.uploading
            : phase === "analyzing"
              ? t.characterSheet.extraction.analyzing
              : t.characterSheet.extraction.run}
        </Button>

        {phase === "analyzing" ? (
          <p className="mt-2 text-[11px] text-ink-faint">
            {t.characterSheet.extraction.analyzingHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** The placard of spec §4.4, in the order it reads best out loud. */
function summaryLine(summary: ExtractionSummary): string {
  const parts = [
    `${summary.observados} ${t.characterSheet.extraction.summary.observados}`,
    summary.inferidos > 0
      ? `${summary.inferidos} ${t.characterSheet.extraction.summary.inferidos} (${t.characterSheet.extraction.summary.review})`
      : null,
    `${summary.vazios} ${t.characterSheet.extraction.summary.vazios}`,
    summary.preservados > 0
      ? `${summary.preservados} ${t.characterSheet.extraction.summary.preservados}`
      : null,
  ].filter((part): part is string => part !== null);

  return parts.join(" · ");
}

function messageFor(result: Extract<ExtractionResult, { ok: false }>): string {
  const errors = t.characterSheet.extraction.errors;

  switch (result.reason) {
    case "insufficient_balance":
      return `${errors.insufficientPrefix} ${result.neededSparks ?? 0} ⚡ ${errors.insufficientMiddle} ${result.balanceSparks ?? 0} ⚡.`;
    case "not_configured":
      return errors.notConfigured;
    case "refused":
      return errors.refused;
    case "unreadable":
      return errors.unreadable;
    case "invalid":
      return errors.invalid;
    default:
      return errors.failed;
  }
}

/**
 * Uploads the reference straight to Storage and returns its path, or null.
 *
 * The path convention is the one the bucket policies of 20260807140500 rely on:
 * the first folder segment is the owner. A fresh uuid per upload means a second
 * analysis of the same character never overwrites the first one's evidence.
 */
async function uploadReferencePhoto(entityId: string, file: File): Promise<string | null> {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;

  if (!userId) return null;

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const storagePath = `${userId}/entities/${entityId}/extraction-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage
    .from("assets")
    .upload(storagePath, file, { contentType: file.type, cacheControl: IMMUTABLE_CACHE_CONTROL });

  return error ? null : storagePath;
}
