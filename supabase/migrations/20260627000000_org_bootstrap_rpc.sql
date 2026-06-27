-- ============================================================================
-- Teranga Broadcast — Phase 0 / M0.1: organization bootstrap RPC
-- Migration: org_bootstrap_rpc
--
-- WHY THIS EXISTS
-- ---------------
-- M0 left a chicken-and-egg gap: RLS lets an authenticated user INSERT an
-- organization, but the policy on organization_members only allows an EXISTING
-- owner/admin to add members. So a brand-new user could create an org yet never
-- become its owner — the first membership could only be seeded with the service
-- role (RLS bypassed). That is fine for local seed data, but real signup needs a
-- safe, atomic path.
--
-- This SECURITY DEFINER RPC closes the gap: it creates the organization AND the
-- caller's `owner` membership in ONE transaction, running with definer rights so
-- it can write the first membership row without tripping RLS. It is the ONLY
-- supported way for a normal user to create an organization.
--
-- The direct INSERT policy on organizations is therefore removed (see below):
-- callers must go through this RPC, which guarantees every org has an owner.
--
-- SAFETY
-- ------
--  * Rejects calls with a null auth.uid() (must be an authenticated user).
--  * search_path pinned to '' and every object schema-qualified (no hijacking).
--  * SECURITY DEFINER + atomic: org and owner membership commit together.
-- ============================================================================

-- Remove the permissive direct-INSERT path; org creation now goes via the RPC.
drop policy if exists organizations_insert on public.organizations;

create or replace function public.create_organization_with_owner(
  org_name text,
  org_slug text,
  org_locale text default 'fr'
)
returns public.organizations
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  new_org public.organizations;
begin
  -- Must be an authenticated user.
  if caller is null then
    raise exception 'create_organization_with_owner: authentication required'
      using errcode = '28000';  -- invalid_authorization_specification
  end if;

  if org_name is null or length(btrim(org_name)) = 0 then
    raise exception 'create_organization_with_owner: org_name is required'
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  if org_slug is null or length(btrim(org_slug)) = 0 then
    raise exception 'create_organization_with_owner: org_slug is required'
      using errcode = '22023';
  end if;

  -- 1) Create the organization.
  insert into public.organizations (name, slug, locale)
  values (btrim(org_name), btrim(org_slug), coalesce(org_locale, 'fr'))
  returning * into new_org;

  -- 2) Create the caller's owner membership (atomic with step 1).
  insert into public.organization_members (organization_id, user_id, role)
  values (new_org.id, caller, 'owner');

  -- 3) Best-effort audit entry (same transaction).
  insert into public.audit_logs (organization_id, actor_id, action, entity_type, entity_id, metadata)
  values (new_org.id, caller, 'organization.created', 'organization', new_org.id,
          jsonb_build_object('slug', new_org.slug));

  return new_org;
end;
$$;

comment on function public.create_organization_with_owner(text, text, text) is
  'Atomically creates an organization and the calling user''s owner membership. '
  'The only supported way for a normal (non-service-role) user to create an org, '
  'since RLS forbids self-inserting the first membership. Rejects null auth.uid().';

-- Only authenticated users may call it (service_role may too, for tooling).
revoke all on function public.create_organization_with_owner(text, text, text) from public;
grant execute on function public.create_organization_with_owner(text, text, text)
  to authenticated, service_role;
