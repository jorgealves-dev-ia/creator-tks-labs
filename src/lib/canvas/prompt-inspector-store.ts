import { create } from "zustand";

/**
 * Which generation, if any, is having its prompt read.
 *
 * Lives outside the node for the same reason the reference picker does: React
 * Flow puts nodes inside a CSS transform, and a modal opened from inside one
 * would be positioned against the canvas and scaled with the zoom.
 */

type PromptInspectorState = {
  generationId: string | null;
  open: (generationId: string) => void;
  close: () => void;
};

export const usePromptInspector = create<PromptInspectorState>((set) => ({
  generationId: null,
  open: (generationId) => set({ generationId }),
  close: () => set({ generationId: null }),
}));
