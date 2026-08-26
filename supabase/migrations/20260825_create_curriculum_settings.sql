create table if not exists public.curriculum_settings (
  id serial primary key,
  current_stage integer not null default 1,
  updated_at timestamptz default now()
);

insert into public.curriculum_settings (current_stage)
  select 1
  where not exists (select 1 from public.curriculum_settings);

alter table public.curriculum_settings enable row level security;

create policy "Authenticated can read curriculum settings"
  on public.curriculum_settings for select
  using (auth.role() = 'authenticated');

grant select on table public.curriculum_settings to authenticated;
grant all on table public.curriculum_settings to service_role;
