-- The default image model becomes Nano Banana 2 (decision of 2026-08-10).
--
-- Decision G2 chose Nano Banana Pro from the inspection of a professional
-- consistency workflow — evidence borrowed from somebody else's product,
-- because this one had not generated a single image yet. It has now, and the
-- evidence is our own: across the canvas validations the cheaper model held
-- identity as well as the Pro did, and on more than one occasion better.
--
--   Nano Banana Pro  gemini-3-pro-image      100 ⚡   ~74c real at 2K
--   Nano Banana 2    gemini-3.1-flash-image   75 ⚡   ~56c real at 2K
--
-- So the default costs the user a quarter less per click, and the Pro is one
-- entry away in the same selector for the generation that asks for it. Nothing
-- is retired: this changes which model is pre-selected, not which models exist.
--
-- Why a migration and not an UPDATE in the SQL editor: `is_default` is
-- catalogue, and the catalogue is the one place allowed to decide what a
-- generation costs (invariant 11). A default set by hand in the dashboard would
-- be a product decision living nowhere — and a database reset would silently
-- restore the seed of 2026-08-09 without anybody noticing the price went up.
--
-- Both rows move in one statement so there is no instant in which the catalogue
-- has two defaults or none. Scoped to Google's two image models by slug: the
-- same column carries the extraction default, and a blanket update would make
-- this a decision about extraction too.

update public.ai_models
   set is_default = (slug = 'gemini-3.1-flash-image')
 where slug in ('gemini-3-pro-image', 'gemini-3.1-flash-image')
   and provider_id = (select id from public.ai_providers where slug = 'google');
