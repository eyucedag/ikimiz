create table if not exists public.couple_document_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) > 0),
  url text not null check (url ~* '^https?://')
);

create index if not exists couple_document_links_couple_created_idx
  on public.couple_document_links(couple_id, created_at desc);

alter table public.couple_document_links enable row level security;
drop policy if exists couple_document_links_select on public.couple_document_links;
create policy couple_document_links_select on public.couple_document_links
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists couple_document_links_insert on public.couple_document_links;
create policy couple_document_links_insert on public.couple_document_links
  for insert to authenticated with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_document_links_delete on public.couple_document_links;
create policy couple_document_links_delete on public.couple_document_links
  for delete to authenticated using (owner_id = auth.uid() and public.is_couple_member(couple_id));

grant select, insert, delete on public.couple_document_links to authenticated;
