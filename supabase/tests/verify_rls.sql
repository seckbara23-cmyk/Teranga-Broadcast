-- ============================================================================
-- Teranga Broadcast — RLS & org-bootstrap verification
--
-- Self-asserting script. Each check RAISEs an exception (aborting the run) on
-- failure and a NOTICE on success. Everything runs inside ONE transaction that
-- is ROLLED BACK at the end, so it is non-destructive — safe to run repeatedly.
--
-- How auth is simulated: Supabase's auth.uid() reads the JWT `sub` claim from
-- the `request.jwt.claims` GUC. We set that GUC and `set role authenticated` so
-- that RLS is actually enforced (the postgres superuser would bypass RLS).
--
-- Run against a LOCAL stack:
--     supabase db reset                 # apply migrations + seed
--     psql "$(supabase status -o env | grep DB_URL | cut -d= -f2)" -f supabase/tests/verify_rls.sql
--   or simply:
--     supabase db reset && supabase db execute --file supabase/tests/verify_rls.sql   # (CLI-version dependent)
-- ============================================================================

begin;

-- --- Setup: two test users (privileged role; auth.uid() FK target) ----------
insert into auth.users (
  id, instance_id, aud, role, email,
  encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'verify-owner@teranga.test',
   crypt('x', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'verify-stranger@teranga.test',
   crypt('x', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now())
on conflict (id) do nothing;

-- ============================================================================
-- Become an authenticated user (USER A = owner-to-be)
-- ============================================================================
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', false);
set role authenticated;

-- --- CHECK 1: authenticated user can create an org via the RPC --------------
select set_config('teranga.test_org_id',
  (select id from public.create_organization_with_owner('Verify Org', 'verify-org', 'fr'))::text,
  false);

do $$
begin
  if current_setting('teranga.test_org_id', true) is null
     or current_setting('teranga.test_org_id', true) = '' then
    raise exception 'FAIL 1: RPC did not return an organization id';
  end if;
  raise notice 'PASS 1: authenticated user created org via RPC';
end $$;

-- --- CHECK 2: owner can see the org and is recorded as owner ----------------
do $$
declare org uuid := current_setting('teranga.test_org_id')::uuid;
begin
  if not exists (select 1 from public.organizations o where o.id = org) then
    raise exception 'FAIL 2a: owner cannot see own organization';
  end if;
  if not exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role = 'owner'
  ) then
    raise exception 'FAIL 2b: owner membership row missing';
  end if;
  raise notice 'PASS 2: owner sees org and owns it';
end $$;

-- --- CHECK 3: audit_logs are append-only (UPDATE/DELETE blocked) ------------
-- The RPC wrote an 'organization.created' audit row. As a member, SELECT works
-- but UPDATE/DELETE must affect 0 rows (no such policies => RLS denies silently).
do $$
declare org uuid := current_setting('teranga.test_org_id')::uuid; n int;
begin
  if not exists (select 1 from public.audit_logs a where a.organization_id = org) then
    raise exception 'FAIL 3a: expected an audit row from org creation';
  end if;

  update public.audit_logs set action = 'tampered' where organization_id = org;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL 3b: audit UPDATE affected % rows (must be 0)', n; end if;

  delete from public.audit_logs where organization_id = org;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL 3c: audit DELETE affected % rows (must be 0)', n; end if;

  raise notice 'PASS 3: audit_logs remain append-only';
end $$;

-- --- CHECK 4: RPC rejects calls with a null auth.uid() ----------------------
do $$
begin
  perform set_config('request.jwt.claims', '', true);  -- clears auth.uid()
  begin
    perform public.create_organization_with_owner('No Auth', 'no-auth');
    raise exception 'FAIL 4: RPC succeeded with null auth.uid()';
  exception
    when sqlstate '28000' then
      raise notice 'PASS 4: RPC rejected unauthenticated call';
  end;
end $$;

-- ============================================================================
-- Become a different authenticated user (USER B = stranger, non-member)
-- ============================================================================
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b2","role":"authenticated"}', false);

-- --- CHECK 5: non-member cannot see the org (or its rows) -------------------
do $$
declare org uuid := current_setting('teranga.test_org_id')::uuid;
begin
  if exists (select 1 from public.organizations o where o.id = org) then
    raise exception 'FAIL 5a: non-member can see organization';
  end if;
  if exists (select 1 from public.organization_members m where m.organization_id = org) then
    raise exception 'FAIL 5b: non-member can see memberships';
  end if;
  if exists (select 1 from public.audit_logs a where a.organization_id = org) then
    raise exception 'FAIL 5c: non-member can see audit_logs';
  end if;
  raise notice 'PASS 5: non-member is fully isolated from the org';
end $$;

-- --- Done -------------------------------------------------------------------
reset role;
do $$ begin raise notice 'ALL CHECKS PASSED'; end $$;

rollback;  -- non-destructive
