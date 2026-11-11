alter table public.couple_documents add column if not exists display_name text;

update public.couple_documents
set display_name = file_name
where display_name is null or btrim(display_name) = '';

alter table public.couple_documents alter column display_name set not null;
