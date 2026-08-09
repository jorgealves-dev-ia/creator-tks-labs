-- The `translation` capability — the free-text half of the prompt compiler.
--
-- Specification: docs/geracao-canonica.md §3.3.
--
-- The compiler is a pure function: it may not call anything over the network.
-- But the sheet's hand-typed fields ("ramo de flores minimalista") are written
-- in Portuguese and have to reach the image model in English. So they are
-- translated once, when the draft is saved, and cached in the sheet next to the
-- text that produced them. The compiler only ever reads that cache.
--
-- That translation is still a model call, and this project has one rule about
-- model calls: the model comes from the catalogue, never from a string buried in
-- the code (architecture invariant 2). Hence a capability rather than a constant.
--
-- Three things this capability deliberately does NOT get:
--
--   * a price column   -- it is internal plumbing, not a purchase. The cost is a
--                         fraction of a cent per edit and belongs to the margin
--                         of the generations it makes possible (§3.3).
--   * a selector       -- there is no choice to offer. The application takes the
--                         cheapest usable row, by sort_order.
--   * a new row        -- Haiku is already in the catalogue as the economy
--                         extraction model. Translating a dozen short fragments
--                         is exactly what it is for.
--
-- The extraction price constraint is unaffected: ai_models_extraction_price_
-- matches_capability only speaks about `extraction`, which stays in the array.

update public.ai_models
   set capabilities = array['extraction', 'translation']
 where slug = 'claude-haiku-4-5'
   and provider_id = (select id from public.ai_providers where slug = 'anthropic');

comment on column public.ai_models.capabilities is
  'What this model may be used for. `extraction` reads a reference into the DNA; '
  '`translation` carries the sheet''s free text into English at save time, '
  'uncharged; `image_gen` and `video_gen` arrive with generation. One catalogue '
  'serves the whole product — that is what this column is for.';
