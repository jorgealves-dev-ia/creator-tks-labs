import { create } from "zustand";

/**
 * Which generation block, if any, has the reference picker open.
 *
 * The picker lives here rather than inside the node for a concrete reason: React
 * Flow puts every node inside a transformed container, and a `position: fixed`
 * element inside a `transform` is positioned against that container instead of
 * the window — and scaled with the zoom. A modal opened from a node would
 * therefore drift and shrink with the canvas.
 *
 * So the modal is rendered once, at the top of the studio, exactly like the
 * character sheet editor. The node says who is asking and how much room is left;
 * the modal writes the chosen images back into that node's data.
 */

type ReferencePickerState = {
  nodeId: string | null;
  /** How many more images this block may accept — the model's ceiling, minus
   *  what is already attached, minus the `@` character's own sheet. */
  remaining: number;
  /** The model's full ceiling, so the modal can explain the number it enforces. */
  limit: number;
  open: (input: { nodeId: string; remaining: number; limit: number }) => void;
  close: () => void;
};

export const useReferencePicker = create<ReferencePickerState>((set) => ({
  nodeId: null,
  remaining: 0,
  limit: 0,

  open: ({ nodeId, remaining, limit }) => set({ nodeId, remaining, limit }),
  close: () => set({ nodeId: null, remaining: 0, limit: 0 }),
}));
