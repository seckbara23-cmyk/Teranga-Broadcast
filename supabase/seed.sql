-- ============================================================================
-- Teranga Broadcast — local development seed
--
-- Applied by `supabase db reset` AFTER migrations. Runs as the privileged
-- service/superuser role, so RLS is bypassed here (the right place to bootstrap
-- the first organization + owner, which RLS otherwise can't create).
--
-- LOCAL DEV ONLY. Fixed UUIDs make the data predictable across resets.
-- ============================================================================

-- Demo organization (RTS Senegal) -------------------------------------------
insert into public.organizations (id, name, slug, locale)
values
  ('00000000-0000-0000-0000-000000000001', 'RTS Senegal', 'rts-senegal', 'fr')
on conflict (id) do nothing;

-- Demo venue ----------------------------------------------------------------
insert into public.venues (id, organization_id, name, city, country, timezone, capacity)
values
  ('00000000-0000-0000-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'Stade Abdoulaye Wade', 'Diamniadio', 'SN', 'Africa/Dakar', 50000)
on conflict (id) do nothing;

-- Demo broadcast project ----------------------------------------------------
insert into public.broadcast_projects (id, organization_id, name, description, status)
values
  ('00000000-0000-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000001',
   'Ligue 1 Senegal 2026', 'Demo project for local development', 'active')
on conflict (id) do nothing;

-- Demo match ----------------------------------------------------------------
insert into public.matches (
  id, organization_id, project_id, venue_id,
  title, competition, sport, home_team, away_team,
  kickoff_at, status, fps, media_storage, local_media_path
)
values (
  '00000000-0000-0000-0000-000000000030',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000020',
  '00000000-0000-0000-0000-000000000010',
  'Casa Sports vs Jaraaf', 'Ligue 1 Senegal', 'football', 'Casa Sports', 'ASC Jaraaf',
  now() + interval '7 days', 'scheduled', 50, 'local', 'C:/Teranga/media/demo-match'
)
on conflict (id) do nothing;

-- Demo owner user + membership (best-effort, local only) ---------------------
-- Creating an auth user requires inserting into the `auth` schema, whose exact
-- columns can vary by Supabase version. This is wrapped so a failure here does
-- NOT abort the rest of the seed — the org/venue/project/match above still load.
do $$
declare
  demo_user_id uuid := '00000000-0000-0000-0000-0000000000aa';
begin
  insert into auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  values (
    demo_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'demo@teranga.broadcast',
    crypt('teranga-demo', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  )
  on conflict (id) do nothing;

  insert into public.organization_members (organization_id, user_id, role)
  values ('00000000-0000-0000-0000-000000000001', demo_user_id, 'owner')
  on conflict (organization_id, user_id) do nothing;

  raise notice 'Seeded demo owner user demo@teranga.broadcast (password: teranga-demo)';
exception when others then
  raise notice 'Skipped demo auth user/membership seed: %', sqlerrm;
end $$;
