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
export type Capability = "extraction" | "image_gen" | "video_gen";

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
  /**
   * The resolutions this model sells, cheapest first — and therefore the ones it
   * *offers*, because there is no offering a size we cannot price.
   *
   * Empty for a capability that has no notion of size (extraction) and for an
   * image model with no price rows yet, in which case the interface offers only
   * the default size at `sparks` and says so about the rest. What it never does
   * is invent a number: a price we did not read in the provider's documentation
   * would be a guess printed next to a button that spends money.
   */
  sizes: ModelImageSize[];
  /**
   * As durações que este modelo vende — e, pela mesma lógica das resoluções,
   * **as que ele oferece**.
   *
   * Vazio para toda capacidade que não é vídeo. Na v1 do vídeo há exatamente
   * uma linha (5s · 720p), e é a **ausência** de uma linha de 10s que trava a
   * duração: não existe oferecer o que não se sabe cobrar. Destravar é uma
   * linha de SQL, não um deploy — e nada nesta tela precisa mudar quando for.
   */
  durations: ModelVideoDuration[];
};

/** One resolution a model sells, at the price the catalogue decided. */
export type ModelImageSize = {
  /** The provider's own identifier — "1K", "2K", "4K". */
  size: string;
  sparks: number;
};

/** Uma duração que um modelo de vídeo vende, ao preço que o catálogo decidiu. */
export type ModelVideoDuration = {
  seconds: number;
  /**
   * A resolução de saída daquele endpoint. Não é escolha de quem chama: no
   * Kling standard ela é fixa e nem sequer é parâmetro da API — é propriedade
   * do endpoint, e por isso viaja junto da duração em vez de num seletor.
   */
  resolution: string;
  sparks: number;
};

export type CatalogProvider = {
  slug: string;
  displayName: string;
  status: ProviderStatus;
  models: CatalogModel[];
};
