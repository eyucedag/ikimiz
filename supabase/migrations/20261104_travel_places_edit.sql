-- Gezilen yer kayıtlarını yalnızca kaydı ekleyen partner düzenleyebilir.
grant update on public.travel_places to authenticated;

drop policy if exists travel_places_update on public.travel_places;
create policy travel_places_update on public.travel_places for update to authenticated
  using (owner_id = auth.uid() and public.is_couple_member(couple_id))
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
