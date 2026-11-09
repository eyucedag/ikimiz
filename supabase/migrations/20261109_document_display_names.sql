alter table public.couple_documents
  add column if not exists display_name text;

update public.couple_documents
set display_name = file_name
where display_name is null or btrim(display_name) = '';

alter table public.couple_documents
  alter column display_name set default 'Belge',
  alter column display_name set not null;

drop policy if exists couple_documents_update on public.couple_documents;
create policy couple_documents_update on public.couple_documents for update to authenticated
  using (owner_id = auth.uid() and public.is_couple_member(couple_id))
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));

grant update on public.couple_documents to authenticated;
