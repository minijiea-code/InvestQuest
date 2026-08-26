create table if not exists public.hunter_profiles (
  id uuid primary key, -- = auth.uid() of the anonymous session
  cohort text not null,
  name text not null,
  gender text,
  created_at timestamptz default now()
);

alter table public.hunter_profiles enable row level security;

create policy "Users manage own hunter profile"
  on public.hunter_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

grant all on table public.hunter_profiles to authenticated;
grant all on table public.hunter_profiles to service_role;
