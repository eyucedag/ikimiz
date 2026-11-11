-- Both active partners can edit and remove shared content. owner_id remains
-- attribution only; notifications and account preferences remain user-scoped.
begin;

create or replace function public.keep_shared_content_attribution()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'INSERT' and auth.uid() is not null and new.owner_id is distinct from auth.uid() then
    raise exception 'Yeni ortak kaydın ekleyeni oturumdaki kullanıcı olmalıdır.';
  end if;
  if tg_op = 'UPDATE' and auth.uid() is not null and new.owner_id is distinct from old.owner_id then
    raise exception 'Ortak kaydın ekleyen bilgisi değiştirilemez.';
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'calendar_events','important_dates','lists','list_items','note_folders','notes',
    'tasks','reminders','partner_facts','gift_ideas','mood_entries','daily_songs',
    'screen_notes','travel_places','couple_documents','couple_document_links',
    'couple_gallery_photos','couple_audio_memories'
  ] loop
    execute format('drop trigger if exists %I_attribution_guard on public.%I', t, t);
    execute format('create trigger %I_attribution_guard before insert or update on public.%I for each row execute function public.keep_shared_content_attribution()', t, t);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'calendar_events','important_dates','lists','list_items','note_folders','notes',
    'tasks','reminders','partner_facts'
  ] loop
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format($p$
      create policy %I_update on public.%I for update to authenticated
      using (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)))
      with check (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)))
    $p$, t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format($p$
      create policy %I_delete on public.%I for delete to authenticated
      using (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)))
    $p$, t, t);
  end loop;
end $$;

-- Hediye fikirleri de ortak kayıttır; kişisel/gizli hediye kaydı yoktur.
alter table public.gift_ideas drop constraint if exists gift_ideas_visibility_check;
update public.gift_ideas set visibility = 'shared' where visibility <> 'shared';
alter table public.gift_ideas add constraint gift_ideas_visibility_check check (visibility in ('personal','shared'));
drop policy if exists gift_ideas_owner on public.gift_ideas;
drop policy if exists gift_ideas_select on public.gift_ideas;
drop policy if exists gift_ideas_insert on public.gift_ideas;
drop policy if exists gift_ideas_update on public.gift_ideas;
drop policy if exists gift_ideas_delete on public.gift_ideas;
drop policy if exists gift_ideas_member_all on public.gift_ideas;
create policy gift_ideas_select on public.gift_ideas for select to authenticated
  using (not is_deleted and (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id))));
create policy gift_ideas_insert on public.gift_ideas for insert to authenticated
  with check (owner_id = auth.uid() and visibility = 'shared' and public.is_couple_member(couple_id));
create policy gift_ideas_update on public.gift_ideas for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (public.is_couple_member(couple_id));
create policy gift_ideas_delete on public.gift_ideas for delete to authenticated
  using (visibility = 'shared' and public.is_couple_member(couple_id));
create policy gift_ideas_member_all on public.gift_ideas for all to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
grant select, insert, update, delete on public.gift_ideas to authenticated;

-- Promote old couple-bound private rows into the couple's common workspace.
-- Rows without a couple remain attached to their existing account until pairing.
do $$
declare t text;
begin
  foreach t in array array[
    'calendar_events','important_dates','lists','list_items','note_folders','notes',
    'tasks','reminders','partner_facts','gift_ideas'
  ] loop
    execute format('update public.%I set visibility = ''shared'' where couple_id is not null and visibility <> ''shared''', t);
  end loop;
end $$;

drop policy if exists mood_entries_update on public.mood_entries;
create policy mood_entries_update on public.mood_entries for update to authenticated
  using (visibility = 'shared' and public.is_couple_member(couple_id))
  with check (visibility = 'shared' and public.is_couple_member(couple_id));
drop policy if exists mood_entries_delete on public.mood_entries;
create policy mood_entries_delete on public.mood_entries for delete to authenticated
  using (visibility = 'shared' and public.is_couple_member(couple_id));

drop policy if exists daily_songs_update on public.daily_songs;
create policy daily_songs_update on public.daily_songs for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists daily_songs_delete on public.daily_songs;
create policy daily_songs_delete on public.daily_songs for delete to authenticated
  using (public.is_couple_member(couple_id));

drop policy if exists screen_notes_update on public.screen_notes;
create policy screen_notes_update on public.screen_notes for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists screen_notes_delete on public.screen_notes;
create policy screen_notes_delete on public.screen_notes for delete to authenticated
  using (public.is_couple_member(couple_id));

drop policy if exists travel_places_delete on public.travel_places;
create policy travel_places_delete on public.travel_places for delete to authenticated
  using (public.is_couple_member(couple_id));

drop policy if exists couple_documents_update on public.couple_documents;
create policy couple_documents_update on public.couple_documents for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists couple_documents_delete on public.couple_documents;
create policy couple_documents_delete on public.couple_documents for delete to authenticated
  using (public.is_couple_member(couple_id));
grant update, delete on public.couple_documents to authenticated;

drop policy if exists couple_document_links_update on public.couple_document_links;
create policy couple_document_links_update on public.couple_document_links for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists couple_document_links_delete on public.couple_document_links;
create policy couple_document_links_delete on public.couple_document_links for delete to authenticated
  using (public.is_couple_member(couple_id));
grant update, delete on public.couple_document_links to authenticated;

drop policy if exists couple_gallery_photos_update on public.couple_gallery_photos;
create policy couple_gallery_photos_update on public.couple_gallery_photos for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists couple_gallery_photos_delete on public.couple_gallery_photos;
create policy couple_gallery_photos_delete on public.couple_gallery_photos for delete to authenticated
  using (public.is_couple_member(couple_id));
grant update, delete on public.couple_gallery_photos to authenticated;

drop policy if exists couple_audio_memories_update on public.couple_audio_memories;
create policy couple_audio_memories_update on public.couple_audio_memories for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists couple_audio_memories_delete on public.couple_audio_memories;
create policy couple_audio_memories_delete on public.couple_audio_memories for delete to authenticated
  using (public.is_couple_member(couple_id));
grant update, delete on public.couple_audio_memories to authenticated;

-- Stored file paths are scoped to a couple, not to the uploader. Insert still
-- requires the uploading member's own path, but either partner may remove it.
drop policy if exists couple_documents_storage_delete on storage.objects;
create policy couple_documents_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'couple-documents' and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists couple_gallery_storage_delete on storage.objects;
create policy couple_gallery_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'couple-gallery' and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists couple_audio_memories_storage_delete on storage.objects;
create policy couple_audio_memories_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'couple-audio-memories' and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists screen_note_stickers_delete on storage.objects;
create policy screen_note_stickers_delete on storage.objects for delete to authenticated using (
  bucket_id = 'screen-note-stickers' and public.is_couple_member((storage.foldername(name))[1]::uuid)
);

commit;
