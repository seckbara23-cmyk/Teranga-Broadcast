-- ============================================================================
-- Teranga Broadcast — Phase 10: AI Broadcast Copilot
-- Migration: ai_engine
--
-- AI-OWNED tables only. The AI observes/reasons/recommends/drafts; it NEVER goes
-- on-air and NEVER writes other engines' tables. It consumes other engines only
-- through their public APIs (the Context Builder). Every action is operator-
-- approved. Provider-agnostic (local / cloud LLM).
-- ============================================================================

create table public.ai_conversations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete set null,
  title           text not null default 'Conversation',
  workspace       text not null default 'global',   -- current page context
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_ai_conversations_org on public.ai_conversations(organization_id, created_at desc);

create trigger trg_ai_conversations_updated_at
  before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_ai_messages_conv on public.ai_messages(conversation_id, created_at);

create table public.ai_recommendations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete set null,
  signature       text,                              -- dedup key
  kind            text not null,
  title           text not null,
  detail          text,
  severity        text not null default 'info' check (severity in ('info','warn')),
  action          jsonb not null default '{}'::jsonb, -- proposed action (advisory)
  status          text not null default 'open'
                  check (status in ('open','accepted','rejected','dismissed')),
  created_at      timestamptz not null default now(),
  unique (organization_id, signature)
);

create index idx_ai_recommendations_org on public.ai_recommendations(organization_id, status, created_at desc);

create table public.ai_tasks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete set null,
  kind            text not null,
  title           text not null,
  params          jsonb not null default '{}'::jsonb,
  status          text not null default 'draft'
                  check (status in ('draft','approved','executed','rejected','error')),
  result          jsonb not null default '{}'::jsonb,
  operator_label  text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_ai_tasks_org on public.ai_tasks(organization_id, status, created_at desc);

create trigger trg_ai_tasks_updated_at
  before update on public.ai_tasks
  for each row execute function public.set_updated_at();

create table public.ai_feedback (
  id                uuid primary key default gen_random_uuid(),
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  recommendation_id uuid references public.ai_recommendations(id) on delete cascade,
  message_id        uuid references public.ai_messages(id) on delete cascade,
  rating            text not null check (rating in ('accept','reject','not_useful')),
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);

create table public.ai_prompts (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  kind            text not null default 'template',
  content         text not null,
  created_at      timestamptz not null default now()
);

create table public.ai_context_snapshots (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  match_id        uuid references public.matches(id) on delete set null,
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  context         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index idx_ai_context_snapshots_org on public.ai_context_snapshots(organization_id, created_at desc);

-- ============================================================================
-- RLS — members read; operators+ manage.
-- ============================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'ai_conversations','ai_messages','ai_recommendations','ai_tasks',
    'ai_feedback','ai_prompts','ai_context_snapshots'
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

alter publication supabase_realtime add table public.ai_messages;
alter publication supabase_realtime add table public.ai_recommendations;
alter publication supabase_realtime add table public.ai_tasks;
