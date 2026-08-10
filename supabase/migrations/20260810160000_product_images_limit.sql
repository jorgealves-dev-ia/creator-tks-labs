-- Products in the Arsenal: the photo ceiling, in the database.
--
-- A product is a row in public.entities with kind = 'product', and its photos
-- are rows in public.entity_images pointing at ordinary assets. No new table on
-- purpose: the entity_kind enum has carried 'product' since
-- 20260807140200_assets_and_entities.sql, entity_images already links one entity
-- to many assets in an order, and both already have the default-deny RLS of the
-- house. Reusing them also means that the day @produto exists it shares a single
-- handle namespace with the characters — which is the only way a namespace can
-- work.
--
-- What was *not* already there is the ceiling. A product holds at most five
-- photos, and that number is not decoration: every photo occupies one of the
-- model's reference slots, which is why the strip in the generating block says
-- "4 de 6" before the click. A product that had quietly grown to eight photos
-- would turn that sentence into a lie — discovered as an API refusal after the
-- money was already at risk.
--
-- Enforced here and not only in the Server Action for the reason the ledger
-- locks are triggers: a rule that has to be remembered is a rule that will
-- eventually be forgotten.

create or replace function public.enforce_product_image_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  photo_count integer;
begin
  -- Products only. A character's canonical images are six named slots governed
  -- by the sheet itself, and nothing here has any business having an opinion
  -- about them.
  if not exists (
    select 1
      from public.entities
     where id = new.entity_id
       and kind = 'product'
  ) then
    return new;
  end if;

  select count(*)
    into photo_count
    from public.entity_images
   where entity_id = new.entity_id;

  -- Five, mirrored by PRODUCT_MAX_PHOTOS in src/lib/products/schema.ts. Raising
  -- it is a migration on purpose: the number is a promise the interface makes
  -- out loud, and a promise kept in two places is a promise that will disagree
  -- with itself.
  if photo_count >= 5 then
    raise exception
      'a product holds at most 5 photos: each photo occupies a reference slot in the generation'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_product_image_limit() is
  'Caps a product at five photos. The cap exists because each photo occupies '
  'one of the model reference slots the generating block counts out loud.';

-- INSERT only, deliberately. The product screen adds and removes links; it never
-- moves one between products, and firing on UPDATE would have to reason about
-- whether the row being updated is already inside its own count.
create trigger entity_images_enforce_product_limit
  before insert on public.entity_images
  for each row execute function public.enforce_product_image_limit();

-- Same reasoning as 20260807150000_revoke_trigger_function_execute.sql: Supabase
-- grants EXECUTE on new functions in `public` to the API roles by default, which
-- publishes them as /rest/v1/rpc endpoints. Postgres refuses to run a trigger
-- function called directly, but the grant is still wrong and the advisor flags it.
revoke execute on function public.enforce_product_image_limit() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- What these columns now hold
-- ---------------------------------------------------------------------------

comment on table public.entities is
  'Mentionable with @handle. Two kinds are in use: `character`, whose `sheet` is '
  'the structured character sheet, and `product`, whose `sheet` holds the default '
  'reference instruction and will hold the extracted product attributes when that '
  'engine arrives. A null project_id means the entity is available in all of the '
  'user''s projects; a set project_id scopes it to that project.';

comment on column public.entities.sheet is
  'The living draft. For a character it is the structured sheet; "save as new '
  'version" copies it into entity_versions. For a product it is '
  '{"instrucao_padrao": "..."} — the sentence every generation starts from. '
  'Generations may run from the draft, but they are recorded as '
  'generations.sheet_source = draft, and @ mentions never resolve to it.';

comment on column public.entity_images.role is
  'What this image is to its entity. For a character, one of the six canonical '
  'slots ("turnaround_frente", "folha_completa"...). For a product, always '
  '"foto" — the photos are peers, and their order is sort_order.';
