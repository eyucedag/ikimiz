alter table public.couple_gallery_photos
  add column if not exists taken_at timestamptz;

update public.couple_gallery_photos
set taken_at = created_at
where taken_at is null;

alter table public.couple_gallery_photos
  alter column taken_at set default now(),
  alter column taken_at set not null;

drop policy if exists couple_gallery_photos_update on public.couple_gallery_photos;
create policy couple_gallery_photos_update on public.couple_gallery_photos
  for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));

grant update on public.couple_gallery_photos to authenticated;
