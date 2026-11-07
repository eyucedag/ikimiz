-- Each partner can add and edit their own song for the shared day.
-- Existing couple/day songs are preserved and remain owned by their original author.
alter table public.daily_songs
  drop constraint if exists daily_songs_couple_id_song_date_key;

create unique index if not exists daily_songs_couple_date_owner_key
  on public.daily_songs (couple_id, song_date, owner_id);

drop policy if exists daily_songs_update on public.daily_songs;
create policy daily_songs_update on public.daily_songs for update to authenticated
  using (owner_id = auth.uid() and public.is_couple_member(couple_id))
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
