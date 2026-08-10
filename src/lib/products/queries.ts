import { parseProductSheet } from "@/lib/products/schema";
import type { Product } from "@/lib/products/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Every product the signed-in user owns, with its photos in order.
 *
 * Not scoped to a project, for the same reason characters are not: a product
 * photographed once is used in every campaign after it, and a project is a
 * workbench rather than a filing cabinet.
 *
 * Archived products are left out — a product is archived, never deleted, so the
 * generations that used it keep pointing at something real.
 */
export async function loadProducts(userId: string): Promise<Product[]> {
  const supabase = await createSupabaseServerClient();

  const { data: rows } = await supabase
    .from("entities")
    .select("id, handle, display_name, sheet")
    .eq("user_id", userId)
    .eq("kind", "product")
    .is("archived_at", null)
    .order("created_at");

  if (!rows || rows.length === 0) {
    return [];
  }

  // One extra query rather than one per product — the same shape loadCharacters
  // uses for the active versions.
  const { data: images } = await supabase
    .from("entity_images")
    .select("entity_id, asset_id, sort_order")
    .in(
      "entity_id",
      rows.map((row) => row.id),
    )
    .order("sort_order");

  const photosByProduct = new Map<string, { assetId: string; sortOrder: number }[]>();

  for (const image of images ?? []) {
    const list = photosByProduct.get(image.entity_id) ?? [];

    list.push({ assetId: image.asset_id, sortOrder: image.sort_order });
    photosByProduct.set(image.entity_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    instrucaoPadrao: parseProductSheet(row.sheet).instrucao_padrao,
    photos: photosByProduct.get(row.id) ?? [],
  }));
}
