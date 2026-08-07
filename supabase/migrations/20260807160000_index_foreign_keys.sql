-- Covering indexes for the foreign keys that lacked one.
--
-- Without these, deleting a parent row (an asset, a workflow) forces a
-- sequential scan of the child table to enforce the constraint. Flagged by the
-- Supabase performance advisor.

create index entities_cover_asset_id_idx
  on public.entities (cover_asset_id)
  where cover_asset_id is not null;

create index entity_images_asset_id_idx on public.entity_images (asset_id);

create index entity_images_user_id_idx on public.entity_images (user_id);

create index generations_result_asset_id_idx
  on public.generations (result_asset_id)
  where result_asset_id is not null;

create index generations_workflow_id_idx
  on public.generations (workflow_id)
  where workflow_id is not null;
