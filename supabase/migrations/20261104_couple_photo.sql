-- Ortak çift fotoğrafı: özel Storage bucket, yalnızca aktif üyeler erişebilir.
begin;

alter table public.couples add column if not exists photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple-photos', 'couple-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_access_couple_photo(p_path text)
returns boolean
language plpgsql stable security definer set search_path = public as $$
declare v_couple_id uuid;
begin
  if p_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/photo$' then
    return false;
  end if;
  v_couple_id := split_part(p_path, '/', 1)::uuid;
  return public.is_couple_member(v_couple_id);
exception when invalid_text_representation then
  return false;
end;
$$;

revoke all on function public.can_access_couple_photo(text) from public, anon;
grant execute on function public.can_access_couple_photo(text) to authenticated;

drop policy if exists couple_photos_select on storage.objects;
create policy couple_photos_select on storage.objects for select to authenticated using (
  bucket_id = 'couple-photos' and public.can_access_couple_photo(name)
);

drop policy if exists couple_photos_insert on storage.objects;
create policy couple_photos_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'couple-photos' and public.can_access_couple_photo(name)
);

drop policy if exists couple_photos_update on storage.objects;
create policy couple_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'couple-photos' and public.can_access_couple_photo(name))
  with check (bucket_id = 'couple-photos' and public.can_access_couple_photo(name));

drop policy if exists couple_photos_delete on storage.objects;
create policy couple_photos_delete on storage.objects for delete to authenticated using (
  bucket_id = 'couple-photos' and public.can_access_couple_photo(name)
);

create or replace function public.set_couple_photo_path(p_path text)
returns text
language plpgsql security definer set search_path = public as $$
declare v_couple_id uuid;
begin
  if p_path !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/photo$' then
    raise exception 'Geçersiz fotoğraf yolu.';
  end if;

  select m.couple_id into v_couple_id
  from public.couple_members m
  where m.user_id = auth.uid() and not m.is_deleted
    and public.is_couple_member(m.couple_id)
  limit 1;

  if v_couple_id is null or split_part(p_path, '/', 1)::uuid <> v_couple_id then
    raise exception 'Etkin bir eşleşme bulunamadı.';
  end if;

  update public.couples set photo_path = p_path, updated_at = now()
  where id = v_couple_id and ended_at is null;
  return p_path;
end;
$$;

revoke all on function public.set_couple_photo_path(text) from public, anon;
grant execute on function public.set_couple_photo_path(text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couples'
  ) then
    alter publication supabase_realtime add table public.couples;
  end if;
end $$;

commit;
