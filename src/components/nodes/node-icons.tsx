/**
 * The glyph of each kind of block, in one place.
 *
 * A canvas where every card looks the same until you read it is a canvas you
 * navigate by reading. The icon is what lets someone find the generating block
 * among six cards at low zoom, before any text is legible — which is also why
 * the same drawing has to appear on the card and in the Arsenal rail that puts
 * it there. Two copies of the same glyph is one copy too many.
 */

export type NodeKind =
  | "character"
  | "product"
  | "generator"
  | "result"
  | "input-image"
  | "input-product"
  | "input-pose"
  | "input-sheet";

export function NodeIcon({ kind, className }: { kind: NodeKind; className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} aria-hidden>
      {PATHS[kind]}
    </svg>
  );
}

const STROKE = {
  stroke: "currentColor",
  strokeWidth: 1.3,
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

const PATHS: Record<NodeKind, React.ReactNode> = {
  character: (
    <>
      <circle cx="8" cy="5.5" r="2.75" {...STROKE} />
      <path d="M2.75 14c0-2.9 2.35-5.25 5.25-5.25S13.25 11.1 13.25 14" {...STROKE} />
    </>
  ),

  // A box in three-quarter view: the only one of the four that is an object
  // rather than a picture of one, which is exactly what a product is here.
  product: (
    <>
      <path d="M8 1.75l5.75 2.9v6.7L8 14.25 2.25 11.35v-6.7L8 1.75z" {...STROKE} />
      <path d="M2.25 4.65L8 7.55l5.75-2.9M8 7.55v6.7" {...STROKE} />
    </>
  ),

  generator: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" {...STROKE} />
      <path d="M1.5 11l3.2-3.2 2.4 2.4 3-3 4.4 4.4" {...STROKE} />
      <circle cx="10.4" cy="6" r="1.1" fill="currentColor" />
    </>
  ),

  // The same frame as the generator, with a tick instead of a picture being
  // drawn: the pair reads as "makes an image" and "is a finished image".
  result: (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" {...STROKE} />
      <path d="M5 8.2l2.1 2.1L11 6.4" {...STROKE} strokeWidth={1.5} />
    </>
  ),

  // The picture frame again, with an arrow going into it. The family of three
  // frames is deliberate: a generating block, a finished image and an image
  // being handed in are all the same rectangle, and what separates them is the
  // one mark inside. Reading the canvas at low zoom is reading those marks.
  "input-image": (
    <>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" {...STROKE} />
      <path d="M8 10.4V4.6M5.6 7l2.4-2.4L10.4 7" {...STROKE} />
    </>
  ),

  // A camera, because what this input hands over is a point of view and not a
  // person — the one thing the chip and the angle list cannot carry.
  "input-pose": (
    <>
      <path d="M2 5.4h2.6l1-1.6h4.8l1 1.6H14v7.2H2V5.4z" {...STROKE} />
      <circle cx="8" cy="9" r="2.3" {...STROKE} />
    </>
  ),

  // The grid of the complete sheet, which is exactly what it is: several views
  // of one person, in one image.
  "input-sheet": (
    <>
      <rect x="1.8" y="2.5" width="12.4" height="11" rx="1.6" {...STROKE} />
      <path d="M8 2.5v11M1.8 8h12.4" {...STROKE} />
    </>
  ),

  // The same box the product card always wore. It keeps the glyph rather than
  // joining the frames, because what it hands over is not a picture — it is an
  // object that several pictures happen to describe.
  "input-product": (
    <>
      <path d="M8 2.4l4.9 2.5v5.7L8 13.1 3.1 10.6V4.9L8 2.4z" {...STROKE} />
      <path d="M3.1 4.9L8 7.4l4.9-2.5M8 7.4v5.7" {...STROKE} />
    </>
  ),
};
