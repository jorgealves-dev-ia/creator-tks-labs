"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback, useEffect, useRef, useState, type DragEvent, type RefObject } from "react";

import { prepareImages, refusalMessage } from "@/lib/assets/upload-client";
import type { UploadOrigin } from "@/lib/assets/upload-label";
import {
  gestureVerdict,
  sendImagesToCanvas,
  type GestureStatus,
  type UploadPreview,
} from "@/lib/canvas/image-gesture";
import { isPastedAddress } from "@/lib/canvas/pasted-address";
import { t } from "@/lib/i18n/pt-BR";

export type { GestureStatus, UploadPreview };

/**
 * Pasting (Ctrl+V) and dropping image files on the canvas — F1a,
 * docs/plano-produto-diz.md.
 *
 * Each image becomes an Input de Imagem, loose where the gesture happened and
 * without a wire — whoever pasted decides what it feeds. And each one travels
 * the SAME road as the «Enviar imagem» button: the same function, the same
 * Storage folder, the same thumbnail, the same registration, the same limits.
 * There is no second way in.
 *
 * This file LISTENS — clipboard, pointer, drag. What the gesture does once the
 * files are checked lives in `lib/canvas/image-gesture.ts`, where it can be
 * proved without a browser.
 *
 * ---------------------------------------------------------------------------
 * What is NOT taken, on purpose
 * ---------------------------------------------------------------------------
 *
 *   an image pasted INTO a text field — pasting in a field stays pasting text:
 *     the handler steps aside for anything editable, and for any open dialog;
 *   a LINK dragged from another tab — fetching a stranger's address would be a
 *     second road, and a server fetching third-party URLs. It gets a sentence
 *     instead of the browser navigating away from the canvas;
 *   the ADDRESS of an image, pasted — the same refusal, for the same reason,
 *     and since 01/10/2026 with its own sentence instead of silence;
 *   a drag that STARTED on this page — an image already in the app is not a
 *     file from outside, and must not become a copy of itself.
 */

const copy = t.generation.upload;

/** How long a finished message stays on screen before it clears itself. */
const MESSAGE_MS = 8000;

/** Anything a paste should go INTO instead of onto the canvas. */
function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;

  if (target instanceof HTMLElement && target.isContentEditable) return true;

  return target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !== null;
}

export function useImageGestures(wrapperRef: RefObject<HTMLDivElement | null>) {
  const { screenToFlowPosition } = useReactFlow();
  const [status, setStatus] = useState<GestureStatus | null>(null);
  /** The pictures on screen while their files travel — drawn by the canvas, never part of the graph. */
  const [previews, setPreviews] = useState<UploadPreview[]>([]);

  /**
   * The last pointer position on the page, in screen coordinates — where a paste
   * lands when it is inside the canvas.
   *
   * Tracked on the DOCUMENT, in the capture phase, on move AND on press — and
   * never cleared by a "leave". Found in the live validation of 27/09: clicking
   * the canvas background starts React Flow's pan gesture, which fires a leave on
   * the wrapper, and a click-then-Ctrl+V (the most common way to paste) landed in
   * the centre instead of under the pointer. Whether the point is on the canvas
   * is asked at paste time, against the canvas' own rectangle.
   */
  const pointer = useRef<{ x: number; y: number } | null>(null);
  /** One gesture at a time: a second one while the first is still sending is refused in words. */
  const sending = useRef(false);
  /** Set by a drag that began on this page, so its drop is never taken for a file from outside. */
  const internalDrag = useRef(false);

  useEffect(() => {
    if (!status || status.tone === "busy") return;

    const timer = setTimeout(() => setStatus(null), MESSAGE_MS);

    return () => clearTimeout(timer);
  }, [status]);

  /**
   * The gesture itself: check everything, then show, send and place.
   *
   * The point on the canvas is fixed at the moment of the gesture — converted
   * to canvas coordinates BEFORE the upload, so panning while it sends does not
   * move where the cards land. So is the moment that names a pasted image.
   */
  const place = useCallback(
    async (files: File[], origin: UploadOrigin, screen: { x: number; y: number }) => {
      if (sending.current) {
        setStatus({ tone: "refused", text: copy.stillSending });
        return;
      }

      // Raised before the first `await`, so two gestures in the same instant
      // cannot both pass the check above. And lowered in a `finally`: this flag
      // is what refuses the NEXT gesture, and one that stayed up after an error
      // answered every paste with «Ainda enviando…» until the page was reloaded.
      sending.current = true;

      try {
        const moment = new Date();
        const position = screenToFlowPosition(screen);
        const prepared = await prepareImages(files);

        if (!prepared.ok) {
          const text = refusalMessage(prepared);

          if (text) setStatus({ tone: "refused", text });

          return;
        }

        setStatus({ tone: "busy", text: copy.sending(prepared.images.length) });

        const outcome = await sendImagesToCanvas({ images: prepared.images, origin, moment, position }, setPreviews);

        setStatus(gestureVerdict(prepared.images.length, outcome));
      } finally {
        sending.current = false;
      }
    },
    [screenToFlowPosition],
  );

  // ── Paste ────────────────────────────────────────────────────────────────
  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      if (isEditable(event.target) || isEditable(document.activeElement)) return;

      // A modal owns the keyboard while it is open — the picker, the character
      // editor, a scene dialog. A paste there is not a paste on the canvas.
      if (document.querySelector("dialog[open]")) return;

      const files = Array.from(event.clipboardData?.files ?? []);

      if (files.length === 0) {
        // «Copiar endereço da imagem» instead of «Copiar imagem»: a line of text
        // where a picture was meant. The canvas does not fetch it — that would
        // be a second road in — but it no longer answers with silence.
        if (isPastedAddress(event.clipboardData?.getData("text/plain") ?? "")) {
          setStatus({ tone: "refused", text: copy.pastedAddress });
        }

        return;
      }

      event.preventDefault();

      // Under the pointer when it is over the canvas; otherwise the centre of
      // what is on screen.
      const box = wrapperRef.current?.getBoundingClientRect();
      const p = pointer.current;
      const onCanvas = box && p && p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom;
      const at = onCanvas
        ? p
        : box
          ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
          : { x: 0, y: 0 };

      void place(files, "colar", at);
    }

    function onPointer(event: PointerEvent) {
      pointer.current = { x: event.clientX, y: event.clientY };
    }

    function onDragStart() {
      internalDrag.current = true;
    }

    function onDragEnd() {
      internalDrag.current = false;
    }

    document.addEventListener("paste", onPaste);
    document.addEventListener("pointermove", onPointer, true);
    document.addEventListener("pointerdown", onPointer, true);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragend", onDragEnd);

    return () => {
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("pointermove", onPointer, true);
      document.removeEventListener("pointerdown", onPointer, true);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragend", onDragEnd);
    };
  }, [place, wrapperRef]);

  // ── Drag from outside ────────────────────────────────────────────────────
  /** True when this drag is one the canvas takes: a file, or a link to refuse in words. */
  const acceptsDrag = useCallback((event: DragEvent) => {
    if (internalDrag.current) return false;

    const types = event.dataTransfer.types;

    return types.includes("Files") || types.includes("text/uri-list");
  }, []);

  /** Handles the drop when it is a file or a link; returns false to leave it to the caller. */
  const handleFileDrop = useCallback(
    (event: DragEvent): boolean => {
      if (!acceptsDrag(event)) return false;

      event.preventDefault();

      const files = Array.from(event.dataTransfer.files);

      if (files.length > 0) {
        void place(files, "soltar", { x: event.clientX, y: event.clientY });
      } else {
        setStatus({ tone: "refused", text: copy.link });
      }

      return true;
    },
    [acceptsDrag, place],
  );

  return { status, previews, acceptsDrag, handleFileDrop };
}
