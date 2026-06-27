-- ============================================================================
-- Teranga Broadcast — Phase 8: Media Engine Foundation
-- Migration: media_engine
--
-- Media-OWNED tables only. The Media Engine is the shared archive/search layer:
-- it stores METADATA about assets produced by other engines, referencing them by
-- ID (source_engine + source_id) — it never writes Replay/Tactics/Graphics/etc.
-- Other engines register assets through the Media service (media.registerAsset).
-- No transcoding, no publishing, no CDN — metadata + organization only.
-- ============================================================================

create table public.media_assets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete set null,

  title           text not null default 'Asset',
  description     text,
  asset_type      text not null default 'other'
                  check (asset_type in (
                    'replay_clip','thumbnail','tactical_svg','tactical_png','tactical_pdf',
                    'graphics_preset','graphics_overlay','match_package','highlight_package',
                    'document','image','video','audio','other'
                  )),
  source_engine   text not null default 'manual'
                  check (source_engine in ('replay','tactics','graphics','production','media','manual')),
  source_id       uuid,                          -- originating row id (reference only)

  file_path       text,
  thumbnail_path  text,
  mime            text,
  duration_s      integer,
  size_bytes      bigint,

  operator_label  text,
  created_by      uuid references auth.users(id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,  -- related ids, export_status, team…

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Idempotent registration (rows with null source_id never conflict).
  unique (organization_id, source_engine, source_id)
);

create index idx_media_assets_org on public.media_assets(organization_id, created_at desc);
create index idx_media_assets_type on public.media_assets(organization_id, asset_type);
create index idx_media_assets_match on public.media_assets(match_id);

create trigger trg_media_assets_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

-- Collections ----------------------------------------------------------------
create table public.media_collections (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete set null,
  name            text not null,
  kind            text not null default 'custom'
                  check (kind in (
                    'match_package','halftime_highlights','fulltime_highlights',
                    'tactical_package','social_clips','coach_report','archive_folder','custom'
                  )),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_media_collections_org on public.media_collections(organization_id, created_at desc);

create trigger trg_media_collections_updated_at
  before update on public.media_collections
  for each row execute function public.set_updated_at();

create table public.media_collection_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  collection_id   uuid not null references public.media_collections(id) on delete cascade,
  asset_id        uuid not null references public.media_assets(id) on delete cascade,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (collection_id, asset_id)
);

create index idx_media_collection_items on public.media_collection_items(collection_id, position);

-- Tags (normalized) ----------------------------------------------------------
create table public.media_tags (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  created_at      timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.media_asset_tags (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id        uuid not null references public.media_assets(id) on delete cascade,
  tag_id          uuid not null references public.media_tags(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (asset_id, tag_id)
);

create index idx_media_asset_tags_asset on public.media_asset_tags(asset_id);
create index idx_media_asset_tags_tag on public.media_asset_tags(tag_id);

-- Media-tracked exports (collection/package exports) -------------------------
create table public.media_exports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  asset_id        uuid references public.media_assets(id) on delete set null,
  collection_id   uuid references public.media_collections(id) on delete set null,
  format          text not null,
  status          text not null default 'ready' check (status in ('pending','ready','error')),
  path            text,
  metadata        jsonb not null default '{}'::jsonb,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_media_exports_org on public.media_exports(organization_id, created_at desc);

-- ============================================================================
-- RLS — members read; operators+ manage.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'media_assets','media_collections','media_collection_items',
    'media_tags','media_asset_tags','media_exports'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format(
      'create policy %1$s_select on public.%1$s for select to authenticated using (public.is_org_member(organization_id));',
      t);
    execute format(
      'create policy %1$s_write on public.%1$s for all to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'',''producer'',''operator''])) with check (public.has_org_role(organization_id, array[''owner'',''admin'',''producer'',''operator'']));',
      t);
    execute format('grant select, insert, update, delete on public.%I to authenticated, service_role;', t);
  end loop;
end $$;

-- Realtime: the library updates as assets are registered, tagged, or collected.
alter publication supabase_realtime add table public.media_assets;
alter publication supabase_realtime add table public.media_asset_tags;
alter publication supabase_realtime add table public.media_collection_items;
alter publication supabase_realtime add table public.media_collections;
