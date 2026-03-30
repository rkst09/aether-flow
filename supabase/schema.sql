-- ─── Aether — Supabase Schema ────────────────────────────────────────────────
-- Run this entire file in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ─── Tables ───────────────────────────────────────────────────────────────────

create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  name          text not null,
  description   text,
  prd_url       text,
  prd_filename  text,
  status        text default 'active' check (status in ('active', 'archived', 'completed')),
  current_phase integer default 1 check (current_phase between 1 and 8),
  tags          text[],
  domain        text,
  product_type  text,
  market        text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table public.personas (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid references public.projects(id) on delete cascade not null,
  name             text not null,
  role             text,
  goals            text[],
  pain_points      text[],
  confidence_score integer check (confidence_score between 0 and 100),
  created_at       timestamptz default now()
);

create table public.journey_maps (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  persona_id uuid references public.personas(id) on delete cascade,
  stages     jsonb,
  created_at timestamptz default now()
);

create table public.backlog_items (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade not null,
  persona_id uuid references public.personas(id),
  task_name  text not null,
  priority   text check (priority in ('high', 'medium', 'low')),
  type       text check (type in ('screen', 'flow', 'component')),
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table public.screens (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade not null,
  persona_id      uuid references public.personas(id),
  name            text not null,
  type            text,
  entry_points    text[],
  exit_points     text[],
  component_hints text[],
  sort_order      integer default 0,
  created_at      timestamptz default now()
);

create table public.agent_runs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  phase       integer not null,
  status      text default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  input_json  jsonb,
  output_json jsonb,
  created_at  timestamptz default now()
);

-- ─── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_projects_updated
  before update on public.projects
  for each row execute function public.handle_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table public.projects      enable row level security;
alter table public.personas      enable row level security;
alter table public.journey_maps  enable row level security;
alter table public.backlog_items enable row level security;
alter table public.screens       enable row level security;
alter table public.agent_runs    enable row level security;

create policy "own_projects"      on public.projects      for all using (auth.uid() = user_id);
create policy "own_personas"      on public.personas      for all using (exists (select 1 from public.projects p where p.id = personas.project_id      and p.user_id = auth.uid()));
create policy "own_journey_maps"  on public.journey_maps  for all using (exists (select 1 from public.projects p where p.id = journey_maps.project_id  and p.user_id = auth.uid()));
create policy "own_backlog_items" on public.backlog_items for all using (exists (select 1 from public.projects p where p.id = backlog_items.project_id  and p.user_id = auth.uid()));
create policy "own_screens"       on public.screens       for all using (exists (select 1 from public.projects p where p.id = screens.project_id       and p.user_id = auth.uid()));
create policy "own_agent_runs"    on public.agent_runs    for all using (exists (select 1 from public.projects p where p.id = agent_runs.project_id    and p.user_id = auth.uid()));

-- ─── Storage ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-files',
  'project-files',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) on conflict (id) do nothing;

create policy "upload_own_files" on storage.objects
  for insert with check (
    bucket_id = 'project-files' and
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "read_own_files" on storage.objects
  for select using (
    bucket_id = 'project-files' and
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "delete_own_files" on storage.objects
  for delete using (
    bucket_id = 'project-files' and
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index idx_projects_user_id    on public.projects(user_id);
create index idx_projects_updated_at on public.projects(updated_at desc);
create index idx_personas_project    on public.personas(project_id);
create index idx_screens_project     on public.screens(project_id);
create index idx_agent_runs_project  on public.agent_runs(project_id);
