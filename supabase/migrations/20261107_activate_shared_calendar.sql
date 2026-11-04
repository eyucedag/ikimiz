create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  visibility text not null default 'shared' check (visibility in ('personal', 'shared')),
  is_deleted boolean not null default false,
  title text not null,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  rrule_string text,
  recurrence_exceptions date[] not null default '{}'
);
create index if not exists calendar_events_couple_start_idx on public.calendar_events(couple_id, starts_at) where is_deleted = false;
alter table public.calendar_events enable row level security;
drop policy if exists calendar_events_select on public.calendar_events;
create policy calendar_events_select on public.calendar_events for select to authenticated
  using (not is_deleted and (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id))));
drop policy if exists calendar_events_insert on public.calendar_events;
create policy calendar_events_insert on public.calendar_events for insert to authenticated
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists calendar_events_update on public.calendar_events;
create policy calendar_events_update on public.calendar_events for update to authenticated
  using (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)))
  with check (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)));
drop policy if exists calendar_events_delete on public.calendar_events;
create policy calendar_events_delete on public.calendar_events for delete to authenticated using (owner_id = auth.uid());
grant select, insert, update, delete on public.calendar_events to authenticated;
