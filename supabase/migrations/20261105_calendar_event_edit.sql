alter table public.calendar_events enable row level security;

drop policy if exists calendar_events_update on public.calendar_events;
create policy calendar_events_update on public.calendar_events
  for update to authenticated
  using (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)))
  with check (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)));

grant select, update on public.calendar_events to authenticated;
