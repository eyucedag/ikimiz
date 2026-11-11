create table if not exists public.daily_songs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  song_date date not null,
  title text not null,
  artist text not null,
  url text not null check (url ~* '^https?://'),
  unique (couple_id, song_date)
);

create index if not exists daily_songs_couple_date_idx on public.daily_songs(couple_id, song_date desc);
alter table public.daily_songs enable row level security;

drop policy if exists daily_songs_select on public.daily_songs;
create policy daily_songs_select on public.daily_songs for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists daily_songs_insert on public.daily_songs;
create policy daily_songs_insert on public.daily_songs for insert to authenticated
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists daily_songs_update on public.daily_songs;
create policy daily_songs_update on public.daily_songs for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists daily_songs_delete on public.daily_songs;
create policy daily_songs_delete on public.daily_songs for delete to authenticated
  using (owner_id = auth.uid() and public.is_couple_member(couple_id));

grant select, insert, update, delete on public.daily_songs to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_songs') then
    alter publication supabase_realtime add table public.daily_songs;
  end if;
end $$;
