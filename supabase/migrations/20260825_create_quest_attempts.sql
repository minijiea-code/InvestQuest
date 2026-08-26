create table if not exists public.quest_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.hunter_profiles(id) on delete cascade,
  lecture_id text not null,
  started_at timestamptz default now(),
  completed_at timestamptz,
  is_completed boolean default false
);

alter table public.quest_attempts enable row level security;

create policy "Users manage own attempts"
  on public.quest_attempts for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

grant all on table public.quest_attempts to authenticated;
grant all on table public.quest_attempts to service_role;
