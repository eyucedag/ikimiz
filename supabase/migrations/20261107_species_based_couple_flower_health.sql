-- Different plants lose health at different rates; cacti are drought tolerant.
create or replace function public.water_couple_flower(p_couple_id uuid)
returns table (health integer, updated_at timestamptz, last_watered_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  decay_per_day integer;
  water_gain integer;
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Not an active member of this couple';
  end if;

  insert into public.couple_flower_state as current_state (couple_id, health, updated_at, last_watered_at)
  values (p_couple_id, 28, now(), now())
  on conflict (couple_id) do update
    set health = least(100, greatest(0,
      current_state.health
      - floor(greatest(0, extract(epoch from (now() - current_state.updated_at))) / 86400 *
        case current_state.plant_type when 'cactus' then 1 when 'violet' then 6 else 9 end)::integer
      + case current_state.plant_type when 'cactus' then 14 when 'violet' then 22 else 28 end
    )),
    updated_at = now(),
    last_watered_at = now();

  return query
    select state.health, state.updated_at, state.last_watered_at
    from public.couple_flower_state as state
    where state.couple_id = p_couple_id;
end;
$$;

revoke all on function public.water_couple_flower(uuid) from public;
grant execute on function public.water_couple_flower(uuid) to authenticated;
