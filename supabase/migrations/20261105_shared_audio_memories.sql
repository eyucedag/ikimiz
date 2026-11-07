create table if not exists public.couple_audio_memories (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  title text check (title is null or length(title) <= 100),
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('audio/mp4', 'audio/m4a', 'audio/3gpp', 'audio/webm')),
  duration_seconds integer not null check (duration_seconds between 1 and 180),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 26214400)
);

create index if not exists couple_audio_memories_couple_created_idx
  on public.couple_audio_memories(couple_id, created_at desc);

alter table public.couple_audio_memories enable row level security;
drop policy if exists couple_audio_memories_select on public.couple_audio_memories;
create policy couple_audio_memories_select on public.couple_audio_memories
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists couple_audio_memories_insert on public.couple_audio_memories;
create policy couple_audio_memories_insert on public.couple_audio_memories
  for insert to authenticated with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_audio_memories_delete on public.couple_audio_memories;
create policy couple_audio_memories_delete on public.couple_audio_memories
  for delete to authenticated using (owner_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, delete on public.couple_audio_memories to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'couple_audio_memories'
  ) then
    alter publication supabase_realtime add table public.couple_audio_memories;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple-audio-memories', 'couple-audio-memories', false, 26214400,
  array['audio/mp4', 'audio/m4a', 'audio/3gpp', 'audio/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists couple_audio_memories_storage_select on storage.objects;
create policy couple_audio_memories_storage_select on storage.objects
  for select to authenticated using (
    bucket_id = 'couple-audio-memories'
    and public.is_couple_member((storage.foldername(name))[1]::uuid)
  );
drop policy if exists couple_audio_memories_storage_insert on storage.objects;
create policy couple_audio_memories_storage_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'couple-audio-memories'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_couple_member((storage.foldername(name))[1]::uuid)
  );
drop policy if exists couple_audio_memories_storage_delete on storage.objects;
create policy couple_audio_memories_storage_delete on storage.objects
  for delete to authenticated using (
    bucket_id = 'couple-audio-memories'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_couple_member((storage.foldername(name))[1]::uuid)
  );
