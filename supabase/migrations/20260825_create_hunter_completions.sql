create table if not exists public.hunter_completions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.hunter_profiles(id) on delete cascade,
  completed_at timestamptz default now()
);

alter table public.hunter_completions enable row level security;

create policy "Users manage own completion"
  on public.hunter_completions for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

grant all on table public.hunter_completions to authenticated;
grant all on table public.hunter_completions to service_role;
