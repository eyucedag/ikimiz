-- Ruh Halim: mevcut kurulumlara uygulanacak ek şema. Tekrar çalıştırılabilir.
-- Her kullanıcı yerel takvim günü başına tek kayıt tutar; kayıt aktif
-- partnerle her zaman paylaşılır. Partner yalnızca okuyabilir.
begin;

create table if not exists public.mood_entries (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid references public.couples(id) on delete set null,
  visibility  text not null default 'shared' check (visibility = 'shared'),
  is_deleted  boolean not null default false,
  entry_date  date not null,
  mood        text not null check (mood in ('great','good','okay','low','rough')),
  note        text not null default '' check (char_length(note) <= 280),
  constraint mood_entries_owner_day_key unique (owner_id, entry_date)
);

create index if not exists mood_entries_couple_date_idx
  on public.mood_entries(couple_id, entry_date desc) where not is_deleted;

drop trigger if exists mood_entries_updated_at on public.mood_entries;
create trigger mood_entries_updated_at before update on public.mood_entries
  for each row execute function public.set_updated_at();

alter table public.mood_entries enable row level security;
grant select, insert, update, delete on table public.mood_entries to authenticated;

-- Eski çift silinince couple_id null olur; sahip kendi kaydını korur.
-- Paylaşımın null olmayan aktif çifte bağlı olması yazma RLS'sinde
-- denetlenir. Kalıcı CHECK, ON DELETE SET NULL işlemini engellerdi.
drop policy if exists mood_entries_select on public.mood_entries;
create policy mood_entries_select on public.mood_entries for select to authenticated using (
  not is_deleted and (
    owner_id = auth.uid()
    or (
      visibility = 'shared'
      and public.is_couple_member(couple_id)
      and public.is_couple_member(couple_id, owner_id)
    )
  )
);

drop policy if exists mood_entries_insert on public.mood_entries;
create policy mood_entries_insert on public.mood_entries for insert to authenticated with check (
  owner_id = auth.uid()
  and visibility = 'shared'
  and couple_id is not null
  and public.is_couple_member(couple_id)
);

-- WITH CHECK sahipliğin başka kullanıcıya taşınmasını da engeller.
drop policy if exists mood_entries_update on public.mood_entries;
create policy mood_entries_update on public.mood_entries for update to authenticated
  using (owner_id = auth.uid())
  with check (
    owner_id = auth.uid()
    and visibility = 'shared'
    and couple_id is not null
    and public.is_couple_member(couple_id)
  );

drop policy if exists mood_entries_delete on public.mood_entries;
create policy mood_entries_delete on public.mood_entries for delete to authenticated
  using (owner_id = auth.uid());

commit;
