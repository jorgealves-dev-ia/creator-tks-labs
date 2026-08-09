-- Extraction price, calibrated with real data (decision E2).
--
-- The seed of 20260808184059 priced Claude Sonnet at 10 Sparks — the
-- specification's own "educated guess", kept on purpose so the first real
-- extractions could replace it with a measurement. They did:
--
--   Sonnet, pasted text : 2764 in / 1689 out tokens -> 19 cents real cost
--   Sonnet, photo       : 2572 in /  824 out tokens -> 12 cents
--   Opus,   pasted text : 2724 in / 1130 out tokens -> 24 cents
--   Haiku,  pasted text : 2097 in / 1021 out tokens ->  4 cents
--
-- At 10 Sparks (10 cents) a Sonnet extraction lost money. The cost is dominated
-- by the *output*: the answer carries 26 keys, and adaptive thinking runs ahead
-- of it. Twenty Sparks leaves a margin under Anthropic's list price and a
-- comfortable one under the introductory price that runs to 2026-08-31.
--
-- `effort` stays at medium rather than dropping to low: the inferred-field rate
-- is product quality, not a cost line. A cheaper analysis that hesitates more
-- moves work onto the person reviewing the yellows.
--
-- Why a migration rather than an UPDATE in the SQL editor: the live value was
-- already changed by hand, so this is a no-op today. It exists so a future reset
-- replays the calibration instead of regressing to the guess — the seed of the
-- previous migration is history, this file is the current price.

update public.ai_models
   set extraction_sparks = 20
 where slug = 'claude-sonnet-5'
   and provider_id = (select id from public.ai_providers where slug = 'anthropic');

comment on column public.ai_models.extraction_sparks is
  'Price in Sparks for one extraction. Read by record_extraction() from this '
  'column and never from the caller, so the price of an extraction is decided by '
  'the catalogue and not by whoever calls the API. Calibrated against '
  'extractions.real_cost_cents — see 20260809005226_calibrate_extraction_price.';
