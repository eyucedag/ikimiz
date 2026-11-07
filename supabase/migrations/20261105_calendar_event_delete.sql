alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_delete on public.calendar_events;
create policy calendar_events_delete on public.calendar_events
  for delete to authenticated
  using (owner_id = auth.uid());

grant select, delete on public.calendar_events to authenticated;
