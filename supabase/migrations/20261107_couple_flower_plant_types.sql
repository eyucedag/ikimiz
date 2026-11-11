-- Let both active partners choose the shared plant while keeping its shared health.
alter table public.couple_flower_state
  add column if not exists plant_type text not null default 'hanging';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'couple_flower_state_plant_type_check'
      and conrelid = 'public.couple_flower_state'::regclass
  ) then
    alter table public.couple_flower_state
      add constraint couple_flower_state_plant_type_check
      check (plant_type in ('hanging', 'cactus', 'violet'));
  end if;
end $$;

create or replace function public.set_couple_flower_plant(p_couple_id uuid, p_plant_type text)
returns table (health integer, updated_at timestamptz, last_watered_at timestamptz, plant_type text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Not an active member of this couple';
  end if;
  if p_plant_type not in ('hanging', 'cactus', 'violet') then
    raise exception 'Invalid plant type';
  end if;

  insert into public.couple_flower_state (couple_id, health, updated_at)
  values (p_couple_id, 72, now())
  on conflict (couple_id) do nothing;

  update public.couple_flower_state as state
    set plant_type = p_plant_type
    where state.couple_id = p_couple_id;

  return query
    select state.health, state.updated_at, state.last_watered_at, state.plant_type
    from public.couple_flower_state as state
    where state.couple_id = p_couple_id;
end;
$$;

revoke all on function public.set_couple_flower_plant(uuid, text) from public;
grant execute on function public.set_couple_flower_plant(uuid, text) to authenticated;
