create or replace function public.notify_kiss_partner_once_per_hour(
  p_partner_id uuid,
  p_couple_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sender_id uuid := auth.uid();
begin
  if v_sender_id is null
    or p_partner_id = v_sender_id
    or not public.is_couple_member(p_couple_id, v_sender_id)
    or not public.is_couple_member(p_couple_id, p_partner_id) then
    raise exception 'Not allowed to notify this partner';
  end if;

  -- Serialize concurrent kiss events for the same recipient before checking the hour window.
  perform pg_advisory_xact_lock(hashtextextended(p_couple_id::text || ':' || p_partner_id::text || ':kiss', 0));

  if exists (
    select 1 from public.notifications n
    where n.owner_id = p_partner_id
      and n.couple_id = p_couple_id
      and n.category = 'couple'
      and n.title = 'Sana bir öpücük gönderdi'
      and n.created_at >= now() - interval '1 hour'
  ) then
    return false;
  end if;

  insert into public.notifications (owner_id, couple_id, category, title, body)
  values (p_partner_id, p_couple_id, 'couple', 'Sana bir öpücük gönderdi', 'Partnerin sana bir öpücük gönderdi. 💋');
  return true;
end;
$$;

revoke all on function public.notify_kiss_partner_once_per_hour(uuid, uuid) from public, anon;
grant execute on function public.notify_kiss_partner_once_per_hour(uuid, uuid) to authenticated;
