create table if not exists public.couple_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400)
);

create index if not exists couple_documents_couple_created_idx on public.couple_documents(couple_id, created_at desc);
alter table public.couple_documents enable row level security;
drop policy if exists couple_documents_select on public.couple_documents;
create policy couple_documents_select on public.couple_documents for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists couple_documents_insert on public.couple_documents;
create policy couple_documents_insert on public.couple_documents for insert to authenticated
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_documents_delete on public.couple_documents;
create policy couple_documents_delete on public.couple_documents for delete to authenticated
  using (owner_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, delete on public.couple_documents to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple-documents', 'couple-documents', false, 26214400, array[
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif'
])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists couple_documents_storage_select on storage.objects;
create policy couple_documents_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'couple-documents' and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists couple_documents_storage_insert on storage.objects;
create policy couple_documents_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'couple-documents' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists couple_documents_storage_delete on storage.objects;
create policy couple_documents_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'couple-documents' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
