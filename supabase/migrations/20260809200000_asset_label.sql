-- Assets get a name a human wrote.
--
-- Specification: docs/nodes-geracao.md §4 — the gallery ("Minhas imagens"),
-- with a simple filter and a light search.
--
-- Why a column and not a derivation: an asset row today holds a uuid, a mime
-- type, a byte count and a storage path. There is no text in it at all, so
-- "search" has nothing to search and a gallery card has nothing to say. The
-- path is not a substitute — half of it is a uuid, and the half that is not was
-- never meant to be read by anyone.
--
-- Deliberately nullable, and deliberately not backfilled. Every asset created
-- before this migration keeps a null label and shows in the gallery with no
-- caption, which is true: nobody ever named it. Inventing a name from a storage
-- path would produce a caption that looks like information and is not.

alter table public.assets
  add column label text;

comment on column public.assets.label is
  'Short human-readable name: the original file name for an upload, or a few '
  'words of the prompt for a generation. Feeds the gallery caption and its '
  'search. Null means nobody named it — every asset from before 2026-08-09 is '
  'one of those, and none was backfilled, because a name invented from a '
  'storage path would read as information without being any.';

alter table public.assets
  add constraint assets_label_length check (label is null or length(label) <= 200);

-- No index for the search, on purpose.
--
-- The search is `ilike '%term%'`, which no btree index can serve; making it fast
-- would mean the pg_trgm extension and a gin index. One user's gallery is
-- hundreds of rows filtered by user_id, which the existing
-- assets_user_id_created_at_idx already narrows to before any text is compared.
-- Ceremony now, measurement later: if a gallery ever gets slow, the fix is one
-- migration and it will be an informed one.
