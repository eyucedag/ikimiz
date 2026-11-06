create table if not exists public.couple_flower_state (
  couple_id uuid primary key references public.couples(id) on delete cascade,
  health integer not null default 72 check (health between 0 and 100),
  updated_at timestamptz not null default now(),
  last_watered_at timestamptz
);

alter table public.couple_flower_state enable row level security;

drop policy if exists couple_flower_state_select on public.couple_flower_state;
create policy couple_flower_state_select on public.couple_flower_state
  for select to authenticated using (public.is_couple_member(couple_id));

grant select on public.couple_flower_state to authenticated;

create or replace function public.get_couple_flower_state(p_couple_id uuid)
returns table (health integer, updated_at timestamptz, last_watered_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Not an active member of this couple';
  end if;

  insert into public.couple_flower_state (couple_id, health, updated_at)
  values (p_couple_id, 72, now())
  on conflict (couple_id) do nothing;

  return query
    select state.health, state.updated_at, state.last_watered_at
    from public.couple_flower_state as state
    where state.couple_id = p_couple_id;
end;
$$;

create or replace function public.water_couple_flower(p_couple_id uuid)
returns table (health integer, updated_at timestamptz, last_watered_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Not an active member of this couple';
  end if;

  insert into public.couple_flower_state as current_state (couple_id, health, updated_at, last_watered_at)
  values (p_couple_id, 28, now(), now())
  on conflict (couple_id) do update
    set health = least(100, greatest(0,
      current_state.health
      - floor(greatest(0, extract(epoch from (now() - current_state.updated_at))) / 86400 * 12)::integer
      + 28
    )),
    updated_at = now(),
    last_watered_at = now();

  return query
    select state.health, state.updated_at, state.last_watered_at
    from public.couple_flower_state as state
    where state.couple_id = p_couple_id;
end;
$$;

revoke all on function public.get_couple_flower_state(uuid) from public;
revoke all on function public.water_couple_flower(uuid) from public;
grant execute on function public.get_couple_flower_state(uuid) to authenticated;
grant execute on function public.water_couple_flower(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_flower_state'
  ) then
    alter publication supabase_realtime add table public.couple_flower_state;
  end if;
end $$;
