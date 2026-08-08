-- Covering index for the composite active-version foreign key.
--
-- 20260807170000_entity_versions.sql created entities_active_version_id_idx as a
-- partial index on a single column:
--
--   create index entities_active_version_id_idx
--     on public.entities (active_version_id)
--     where active_version_id is not null;
--
-- But the foreign key it exists to cover is composite — it is what stops @julia
-- from pointing at a version of @carla:
--
--   foreign key (active_version_id, id)
--     references public.entity_versions (id, entity_id)
--
-- The index columns therefore did not match the constraint columns, and the
-- Supabase performance advisor flagged the foreign key as uncovered. Without a
-- covering index, deleting the referenced row forces a sequential scan of
-- entities to enforce the constraint — exactly the problem
-- 20260807160000_index_foreign_keys.sql fixed for the five foreign keys that
-- lacked one. Same convention applies here.
--
-- The partial WHERE clause goes away with the old index. Keeping it would leave
-- the same mismatch: an index only counts as covering when its leading columns
-- line up with the constraint columns, in order. Nothing is lost by dropping the
-- predicate — rows with a null pointer simply are not indexed by the composite
-- index either, since a null leading column produces no index entry that a
-- referential-integrity lookup would ever probe for.

drop index if exists public.entities_active_version_id_idx;

create index entities_active_version_id_idx
  on public.entities (active_version_id, id);

comment on index public.entities_active_version_id_idx is
  'Covers the composite foreign key entities_active_version_belongs_to_entity. '
  'Column order matches the constraint on purpose.';
