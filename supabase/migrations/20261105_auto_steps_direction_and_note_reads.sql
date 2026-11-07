-- Share a direction-arrow opt-in separately from the foreground location used for step proximity.
alter table public.couple_live_locations
  add column if not exists direction_enabled boolean not null default false;

-- A sender can see when the recipient opened their screen note.
alter table public.screen_notes add column if not exists read_at timestamptz;

create or replace function public.mark_screen_note_read(p_note_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.'; end if;
  update public.screen_notes
    set read_at = coalesce(read_at, now())
    where id = p_note_id and receiver_id = auth.uid() and not is_deleted;
end;
$$;
revoke all on function public.mark_screen_note_read(uuid) from public, anon;
grant execute on function public.mark_screen_note_read(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'screen_notes'
  ) then
    alter publication supabase_realtime add table public.screen_notes;
  end if;
end $$;
