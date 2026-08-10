/**
 * A product as the interface knows it. Shared by server and browser code, so it
 * holds no Supabase client type and no server-only import — the same rule that
 * shapes lib/entities/types.ts.
 *
 * In SQL a product is a row of `entities` with `kind = 'product'` and its photos
 * are rows of `entity_images`. That is the database's vocabulary; everything the
 * user sees calls it a product and calls those photos its photos.
 */

/** One photo of a product. `sortOrder` is the order it was added in. */
export type ProductPhoto = {
  assetId: string;
  sortOrder: number;
};

export type Product = {
  id: string;
  /**
   * Generated from the name and unique per user, because it shares the handle
   * namespace with the characters. Nothing types it yet — `@produto` in a prompt
   * is registered for later — but the namespace has to be one namespace from the
   * first day, not merged after two thousand products exist.
   */
  handle: string;
  displayName: string;
  /**
   * The sentence every generation using this product starts from — "a modelo
   * veste esta peça exatamente como mostrada". Empty is a legitimate state: the
   * fidelity clause of the `produto` reference kind already says the essential.
   */
  instrucaoPadrao: string;
  /** In `sortOrder`; the first one is the card's thumbnail. */
  photos: ProductPhoto[];
};
