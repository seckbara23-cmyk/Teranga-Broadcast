-- ============================================================================
-- Teranga Broadcast — Phase 5: Broadcast Agent Foundation
-- Migration: broadcast_agent
--
-- Kernel-owned AgentRegistry tables (ENGINE_SPECIFICATIONS §1). The Teranga
-- Agent (a trusted local service) reports here via the service role; operators
-- READ via RLS. The Agent owns hardware; the web app owns operators. Production/
-- Replay/Graphics never write these tables.
--
-- These are ORG-scoped (a workstation belongs to a tenant), distinct from the
-- match-scoped `agent_sessions` table created in M0 (reserved for future
-- match-binding). Metadata only — NO media.
-- ============================================================================

create table public.broadcast_agents (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_key       text not null,                 -- stable per-workstation id
  name            text not null default 'Agent',
  platform        text,
  version         text,
  status          text not null default 'offline'
                  check (status in ('online','degraded','offline')),
  health          jsonb not null default '{}'::jsonb,  -- cpu/mem/disk/net/latency
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, agent_key)
);

create index idx_broadcast_agents_org on public.broadcast_agents(organization_id);

create trigger trg_broadcast_agents_updated_at
  before update on public.broadcast_agents
  for each row execute function public.set_updated_at();

create table public.agent_devices (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  agent_id        uuid not null references public.broadcast_agents(id) on delete cascade,
  device_type     text not null check (device_type in (
                    'obs','vmix','atem','ndi','ffmpeg','hyperdeck','evs'
                  )),
  device_key      text not null,
  status          text not null default 'offline'
                  check (status in ('connected','connecting','disconnected','error','offline')),
  version         text,
  latency_ms      integer,
  capabilities    jsonb not null default '{}'::jsonb,
  stats           jsonb not null default '{}'::jsonb,  -- OBSStatus / ReplayBufferStatus
  updated_at      timestamptz not null default now(),
  unique (agent_id, device_type, device_key)
);

create index idx_agent_devices_agent on public.agent_devices(agent_id);
create index idx_agent_devices_org on public.agent_devices(organization_id);

create trigger trg_agent_devices_updated_at
  before update on public.agent_devices
  for each row execute function public.set_updated_at();

-- RLS: members read; org admins may manage; the Agent writes via service role.
alter table public.broadcast_agents enable row level security;
alter table public.agent_devices    enable row level security;

create policy broadcast_agents_select on public.broadcast_agents
  for select to authenticated using (public.is_org_member(organization_id));
create policy broadcast_agents_manage on public.broadcast_agents
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

create policy agent_devices_select on public.agent_devices
  for select to authenticated using (public.is_org_member(organization_id));
create policy agent_devices_manage on public.agent_devices
  for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']))
  with check (public.has_org_role(organization_id, array['owner','admin']));

grant select, insert, update, delete on public.broadcast_agents to authenticated, service_role;
grant select, insert, update, delete on public.agent_devices    to authenticated, service_role;

-- Realtime: the device dashboard + system health update live.
alter publication supabase_realtime add table public.broadcast_agents;
alter publication supabase_realtime add table public.agent_devices;
