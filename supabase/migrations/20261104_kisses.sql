-- Öpücük: partnerler arasında istenildiği zaman gönderilebilen anlık olay.
begin;

create table if not exists public.kisses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  partner_id  uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid not null references public.couples(id) on delete cascade,
  local_date  date not null,
  constraint kisses_no_self_send check (owner_id <> partner_id)
);

create index if not exists kisses_partner_created_idx
  on public.kisses(partner_id, created_at desc);

alter table public.kisses enable row level security;
grant select, insert on table public.kisses to authenticated;

drop policy if exists kisses_select on public.kisses;
create policy kisses_select on public.kisses for select to authenticated using (
  owner_id = auth.uid()
  or (
    partner_id = auth.uid()
    and public.is_couple_member(couple_id)
    and public.is_couple_member(couple_id, owner_id)
  )
);

drop policy if exists kisses_insert on public.kisses;
create policy kisses_insert on public.kisses for insert to authenticated with check (
  owner_id = auth.uid()
  and owner_id <> partner_id
  and public.is_couple_member(couple_id)
  and public.is_couple_member(couple_id, partner_id)
);

-- Supabase Realtime ile partner uygulamasında animasyonu gösterebilmek için.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kisses'
  ) then
    alter publication supabase_realtime add table public.kisses;
  end if;
end $$;

commit;
