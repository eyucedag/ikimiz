-- Her iki partner de ortak gezilen yer kayıtlarını düzenleyebilir.
grant update on public.travel_places to authenticated;

drop policy if exists travel_places_update on public.travel_places;
create policy travel_places_update on public.travel_places for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
