-- Shared foreground location, phone pedometer counts, and relationship start time.
alter table public.couples add column if not exists relationship_started_at timestamptz;

create or replace function public.set_relationship_started_at(p_started_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare v_couple_id uuid;
begin
  if p_started_at > now() then raise exception 'Relationship start cannot be in the future'; end if;
  select couple_id into v_couple_id from public.couple_members
    where user_id = auth.uid() and not is_deleted limit 1;
  if v_couple_id is null or not public.is_couple_member(v_couple_id) then raise exception 'No active couple'; end if;
  update public.couples set relationship_started_at = p_started_at where id = v_couple_id;
end;
$$;
revoke all on function public.set_relationship_started_at(timestamptz) from public, anon;
grant execute on function public.set_relationship_started_at(timestamptz) to authenticated;

create table if not exists public.couple_live_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  heading double precision,
  updated_at timestamptz not null default now()
);
alter table public.couple_live_locations enable row level security;
drop policy if exists couple_live_locations_select on public.couple_live_locations;
create policy couple_live_locations_select on public.couple_live_locations for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists couple_live_locations_insert on public.couple_live_locations;
create policy couple_live_locations_insert on public.couple_live_locations for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_live_locations_update on public.couple_live_locations;
create policy couple_live_locations_update on public.couple_live_locations for update to authenticated
  using (user_id = auth.uid() and public.is_couple_member(couple_id))
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_live_locations_delete on public.couple_live_locations;
create policy couple_live_locations_delete on public.couple_live_locations for delete to authenticated using (user_id = auth.uid());

create table if not exists public.couple_daily_steps (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  steps integer not null default 0 check (steps >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date)
);
alter table public.couple_daily_steps enable row level security;
drop policy if exists couple_daily_steps_select on public.couple_daily_steps;
create policy couple_daily_steps_select on public.couple_daily_steps for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists couple_daily_steps_insert on public.couple_daily_steps;
create policy couple_daily_steps_insert on public.couple_daily_steps for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_daily_steps_update on public.couple_daily_steps;
create policy couple_daily_steps_update on public.couple_daily_steps for update to authenticated
  using (user_id = auth.uid() and public.is_couple_member(couple_id))
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, update, delete on public.couple_live_locations, public.couple_daily_steps to authenticated;

alter table public.screen_notes add column if not exists image_path text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screen-note-stickers', 'screen-note-stickers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists screen_note_stickers_select on storage.objects;
create policy screen_note_stickers_select on storage.objects for select to authenticated using (
  bucket_id = 'screen-note-stickers' and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists screen_note_stickers_insert on storage.objects;
create policy screen_note_stickers_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'screen-note-stickers' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists screen_note_stickers_delete on storage.objects;
create policy screen_note_stickers_delete on storage.objects for delete to authenticated using (
  bucket_id = 'screen-note-stickers' and (storage.foldername(name))[2] = auth.uid()::text
);

grant select, insert, update, delete on public.screen_notes to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='couple_live_locations') then
    alter publication supabase_realtime add table public.couple_live_locations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='couple_daily_steps') then
    alter publication supabase_realtime add table public.couple_daily_steps;
  end if;
end $$;
