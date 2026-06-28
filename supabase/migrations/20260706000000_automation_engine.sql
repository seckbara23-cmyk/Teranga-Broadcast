-- ============================================================================
-- Teranga Broadcast — Phase 9: Broadcast Automation Engine
-- Migration: automation_engine
--
-- Automation-OWNED tables only. Automation orchestrates other engines by calling
-- their public APIs/services — it NEVER writes Replay/Graphics/Production/Media/
-- Tactics tables. Human-in-the-loop: every workflow has an approval mode.
-- ============================================================================

create table public.automation_workflows (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  description     text,
  template        text not null default 'custom',
  enabled         boolean not null default true,
  approval_mode   text not null default 'ask_operator'
                  check (approval_mode in ('automatic','ask_operator','disabled')),
  graph           jsonb not null default '{}'::jsonb,   -- editor layout
  operator_label  text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_automation_workflows_org on public.automation_workflows(organization_id, created_at desc);

create trigger trg_automation_workflows_updated_at
  before update on public.automation_workflows
  for each row execute function public.set_updated_at();

-- Trigger binding: when <trigger_type> matches <conditions>, run the workflow.
create table public.automation_rules (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_id     uuid not null references public.automation_workflows(id) on delete cascade,
  trigger_type    text not null default 'manual',
  conditions      jsonb not null default '[]'::jsonb,
  enabled         boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_automation_rules_workflow on public.automation_rules(workflow_id);
create index idx_automation_rules_trigger on public.automation_rules(organization_id, trigger_type);

-- Ordered executable steps (the workflow body: conditions / delays / actions / end).
create table public.automation_actions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_id     uuid not null references public.automation_workflows(id) on delete cascade,
  position        integer not null default 0,
  kind            text not null check (kind in ('condition','delay','action','end')),
  ref             text,                               -- action_type / condition_type
  params          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_automation_actions_workflow on public.automation_actions(workflow_id, position);

-- Incoming trigger signals (match event / manual / timer / operator action…).
create table public.automation_triggers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  trigger_type    text not null,
  source          text,
  match_id        uuid references public.matches(id) on delete set null,
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'handled' check (status in ('pending','handled','ignored')),
  created_at      timestamptz not null default now()
);

create index idx_automation_triggers_org on public.automation_triggers(organization_id, created_at desc);

-- Workflow runs.
create table public.automation_executions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  workflow_id     uuid not null references public.automation_workflows(id) on delete cascade,
  trigger_id      uuid references public.automation_triggers(id) on delete set null,
  match_id        uuid references public.matches(id) on delete set null,
  status          text not null default 'running'
                  check (status in ('pending_approval','running','completed','failed','cancelled','rejected')),
  trigger_type    text,
  operator_label  text,
  started_at      timestamptz,
  finished_at     timestamptz,
  duration_ms     integer,
  result          jsonb not null default '{}'::jsonb,
  error           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index idx_automation_executions_org on public.automation_executions(organization_id, created_at desc);
create index idx_automation_executions_status on public.automation_executions(organization_id, status);

-- Per-execution action logs (searchable audit).
create table public.automation_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  execution_id    uuid references public.automation_executions(id) on delete cascade,
  level           text not null default 'info' check (level in ('info','warn','error')),
  action_ref      text,
  message         text not null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_automation_logs_exec on public.automation_logs(execution_id, created_at);
create index idx_automation_logs_org on public.automation_logs(organization_id, created_at desc);

-- ============================================================================
-- RLS — members read; operators+ manage automation.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'automation_workflows','automation_rules','automation_actions',
    'automation_triggers','automation_executions','automation_logs'
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

-- Realtime: live execution + pending-approval sync.
alter publication supabase_realtime add table public.automation_workflows;
alter publication supabase_realtime add table public.automation_executions;
alter publication supabase_realtime add table public.automation_triggers;
