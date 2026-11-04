-- Partnerlerin birlikte ziyaret ettikleri yerler için ortak harita.
begin;

create table if not exists public.travel_places (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  city text not null check (char_length(city) between 1 and 120),
  country text not null check (char_length(country) between 1 and 120),
  note text check (note is null or char_length(note) <= 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  visited_on date not null default current_date
);

create index if not exists travel_places_couple_date_idx
  on public.travel_places(couple_id, visited_on desc);

alter table public.travel_places enable row level security;
grant select, insert, update, delete on public.travel_places to authenticated;

drop policy if exists travel_places_select on public.travel_places;
create policy travel_places_select on public.travel_places for select to authenticated using (
  public.is_couple_member(couple_id)
);

drop policy if exists travel_places_insert on public.travel_places;
create policy travel_places_insert on public.travel_places for insert to authenticated with check (
  owner_id = auth.uid() and public.is_couple_member(couple_id)
);

drop policy if exists travel_places_update on public.travel_places;
create policy travel_places_update on public.travel_places for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

drop policy if exists travel_places_delete on public.travel_places;
create policy travel_places_delete on public.travel_places for delete to authenticated using (
  owner_id = auth.uid() and public.is_couple_member(couple_id)
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'travel_places'
  ) then
    alter publication supabase_realtime add table public.travel_places;
  end if;
end $$;

commit;
