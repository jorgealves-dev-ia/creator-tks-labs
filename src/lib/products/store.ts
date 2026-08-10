import { create } from "zustand";

import type { Product, ProductPhoto } from "@/lib/products/types";

/**
 * The products the browser knows about, in the shape lib/entities/store.ts
 * already established for characters.
 *
 * Deliberately much smaller than that store: a product has no draft, no frozen
 * versions and no compiled preview, so there is nothing here to keep in sync
 * beyond a name, a sentence and a list of photos. Everything the canvas card and
 * the Arsenal rail show is read from here, which is what makes renaming a
 * product update every card of it at once — and what keeps the saved graph from
 * ever carrying a stale copy of a product's photos.
 */

type ProductsState = {
  products: Record<string, Product>;
  /** Display order, kept apart so the record can be looked up by id. */
  order: string[];
  /**
   * False until the server list has arrived. Seeding happens in an effect —
   * never during render, which on the server would leak one visitor's products
   * into another's request — so a card can tell "not loaded yet" from "gone".
   */
  seeded: boolean;
  /** The product whose editor is open, or "new" while one is being created. */
  editing: { productId: string } | { productId: null } | null;

  seed: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  setDisplayName: (id: string, displayName: string) => void;
  setInstruction: (id: string, instrucaoPadrao: string) => void;
  setPhotos: (id: string, photos: ProductPhoto[]) => void;
  /** Takes an archived product out of the lists; the row itself is preserved. */
  forget: (id: string) => void;

  openEditor: (id: string) => void;
  openCreator: () => void;
  closeEditor: () => void;
};

export const useProductsStore = create<ProductsState>((set) => ({
  products: {},
  order: [],
  seeded: false,
  editing: null,

  seed: (products) =>
    set({
      products: Object.fromEntries(products.map((product) => [product.id, product])),
      order: products.map((product) => product.id),
      seeded: true,
    }),

  addProduct: (product) =>
    set((state) => ({
      products: { ...state.products, [product.id]: product },
      order: state.order.includes(product.id) ? state.order : [...state.order, product.id],
    })),

  setDisplayName: (id, displayName) => set((state) => patch(state, id, { displayName })),
  setInstruction: (id, instrucaoPadrao) => set((state) => patch(state, id, { instrucaoPadrao })),
  setPhotos: (id, photos) => set((state) => patch(state, id, { photos })),

  forget: (id) =>
    set((state) => {
      const products = { ...state.products };
      delete products[id];

      return { products, order: state.order.filter((entry) => entry !== id) };
    }),

  openEditor: (productId) => set({ editing: { productId } }),
  openCreator: () => set({ editing: { productId: null } }),
  closeEditor: () => set({ editing: null }),
}));

function patch(
  state: ProductsState,
  id: string,
  changes: Partial<Product>,
): Pick<ProductsState, "products"> | Record<string, never> {
  const current = state.products[id];

  if (!current) return {};

  return { products: { ...state.products, [id]: { ...current, ...changes } } };
}
