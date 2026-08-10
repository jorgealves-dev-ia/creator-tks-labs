import { z } from "zod";

import type { Json } from "@/lib/supabase/database.types";

/**
 * The product's sheet — `entities.sheet` for a row with `kind = 'product'`.
 *
 * jsonb rather than a column, and validated at the boundary like every other
 * jsonb in this project. Not a shortcut: this is the same slot the character
 * sheet lives in, and it is where the extracted product attributes (material,
 * colours, dimensions — the pending item of decision N4) will land without a
 * migration when that engine arrives.
 */

/**
 * Five, mirrored by the trigger in
 * supabase/migrations/20260810160000_product_images_limit.sql.
 *
 * The number is a promise the generating block makes out loud — each photo
 * occupies one of the model's reference slots, which is what makes "4 de 6"
 * true. Stated twice on purpose, and changed in both places or in neither.
 */
export const PRODUCT_MAX_PHOTOS = 5;

/** The column allows more; a reference instruction is a sentence, not a brief. */
export const PRODUCT_INSTRUCTION_MAX_LENGTH = 400;

const productSheetSchema = z.object({
  instrucao_padrao: z.string().max(PRODUCT_INSTRUCTION_MAX_LENGTH).default(""),
});

export type ProductSheet = z.infer<typeof productSheetSchema>;

export function createEmptyProductSheet(): ProductSheet {
  return { instrucao_padrao: "" };
}

/**
 * Reads a stored sheet. An unreadable one yields an empty sheet rather than an
 * error: a product whose instruction cannot be parsed is still a product with
 * photos, and the photos are the part that matters.
 */
export function parseProductSheet(value: unknown): ProductSheet {
  const parsed = productSheetSchema.safeParse(value ?? {});

  return parsed.success ? parsed.data : createEmptyProductSheet();
}

/** Narrows the sheet to the plain JSON the column accepts. */
export function productSheetToJson(sheet: ProductSheet): Json {
  return { instrucao_padrao: sheet.instrucao_padrao };
}
