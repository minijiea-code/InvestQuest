create table if not exists public.quest_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid references public.quest_attempts(id) on delete cascade,
  screen_id integer not null,
  selected_answer text[],
  is_correct boolean not null,
  answered_at timestamptz default now()
);

alter table public.quest_answers enable row level security;

create policy "Users manage own answers"
  on public.quest_answers for all
  using (
    exists (
      select 1 from public.quest_attempts a
      where a.id = attempt_id and a.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.quest_attempts a
      where a.id = attempt_id and a.profile_id = auth.uid()
    )
  );

grant all on table public.quest_answers to authenticated;
grant all on table public.quest_answers to service_role;
