begin;

-- Apply drought damage before watering, so a long-dry plant can still recover.
create or replace function public.water_couple_flower(p_couple_id uuid)
returns table (health integer, updated_at timestamptz, last_watered_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Not an active member of this couple';
  end if;
  insert into public.couple_flower_state (couple_id) values (p_couple_id)
    on conflict (couple_id) do nothing;
  update public.couple_flower_state as state
  set health = least(100, greatest(0, state.health - floor(
        greatest(0, extract(epoch from (now() - state.updated_at))) / 86400 *
        case state.plant_type when 'cactus' then 1 when 'violet' then 6 else 9 end
      )::integer) + case state.plant_type when 'cactus' then 14 when 'violet' then 22 else 28 end),
      updated_at = now(), last_watered_at = now()
  where state.couple_id = p_couple_id;
  return query select state.health, state.updated_at, state.last_watered_at
    from public.couple_flower_state as state where state.couple_id = p_couple_id;
end;
$$;

-- Changing species must not retroactively use the new species' drought rate.
create or replace function public.set_couple_flower_plant(p_couple_id uuid, p_plant_type text)
returns table (health integer, updated_at timestamptz, last_watered_at timestamptz, plant_type text)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not public.is_couple_member(p_couple_id) then
    raise exception 'Not an active member of this couple';
  end if;
  if p_plant_type is null or p_plant_type not in ('hanging', 'cactus', 'violet') then
    raise exception 'Invalid plant type';
  end if;
  insert into public.couple_flower_state (couple_id) values (p_couple_id)
    on conflict (couple_id) do nothing;
  update public.couple_flower_state as state
  set health = greatest(0, state.health - floor(
        greatest(0, extract(epoch from (now() - state.updated_at))) / 86400 *
        case state.plant_type when 'cactus' then 1 when 'violet' then 6 else 9 end
      )::integer), updated_at = now(), plant_type = p_plant_type
  where state.couple_id = p_couple_id;
  return query select state.health, state.updated_at, state.last_watered_at, state.plant_type
    from public.couple_flower_state as state where state.couple_id = p_couple_id;
end;
$$;

revoke all on function public.water_couple_flower(uuid) from public;
revoke all on function public.set_couple_flower_plant(uuid, text) from public;
grant execute on function public.water_couple_flower(uuid) to authenticated;
grant execute on function public.set_couple_flower_plant(uuid, text) to authenticated;

commit;
