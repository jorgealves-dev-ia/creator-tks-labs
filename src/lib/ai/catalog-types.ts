/**
 * What the model selector needs to know, for any capability.
 *
 * These types live apart from the query that fills them because the selector is
 * a client component: it may import the shape, never the code that reads the
 * database or looks at an API key.
 */

/**
 * Why a provider is or is not usable. Two failures with two different cures, and
 * the interface has to say which — telling someone to configure a key they
 * already configured is worse than saying nothing.
 */
export type ProviderStatus = "ready" | "missing_key" | "no_adapter";

/** What the product can ask a model to do. Mirrors ai_models.capabilities. */
export type Capability = "extraction" | "image_gen";

export type CatalogModel = {
  id: string;
  /**
   * The provider's own identifier, e.g. `gemini-3-pro-image`.
   *
   * Travels to the browser because the limits of a model are a property of the
   * model: how many reference images it accepts, which proportions it can draw.
   * The interface has to state those *before* the click — a ceiling discovered
   * as an API error after the fact is not a ceiling, it is a surprise. It is not
   * a secret in any sense: it is the same string the user's own history shows in
   * generations.model.
   */
  slug: string;
  displayName: string;
  /** The price for one unit of this capability, from the catalogue's own column. */
  sparks: number;
  isDefault: boolean;
};

export type CatalogProvider = {
  slug: string;
  displayName: string;
  status: ProviderStatus;
  models: CatalogModel[];
};
