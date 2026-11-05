-- =====================================================================
-- İkimiz — Supabase (PostgreSQL) şeması
-- Aşama 1: kimlik, eşleşme, ekran notları, bildirimler, ruh halleri, öpücük (uygulamada aktif)
-- Aşama 2: takvim, listeler, notlar, görevler, hatırlatmalar, hediye radarı,
--          bilinmesi gerekenler (tablolar hazır, arayüz sonraki aşamada)
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → bu dosyanın tamamını
-- yapıştırıp "Run". Betik tekrar çalıştırılabilir (idempotent) olacak
-- şekilde yazılmıştır.
--
-- ORTAK SÜTUN SÖZLEŞMESİ (Öpücük olay tablosu dışındaki 18 tabloda):
--   id          uuid        birincil anahtar
--   created_at  timestamptz oluşturulma zamanı
--   updated_at  timestamptz set_updated_at() tetikleyicisiyle güncellenir
--   owner_id    uuid        kaydı oluşturan / sahibi olan kullanıcı
--   couple_id   uuid        kaydın ait olduğu çift (kişisel kayıtlarda null olabilir)
--   visibility  text        'personal' (yalnızca sahibi) | 'shared' (çiftin iki üyesi)
--   is_deleted  boolean     yumuşak silme; istemciler is_deleted = false filtreler
--
-- TEKRAR MODELİ: calendar_events, tasks ve reminders tablolarında
--   rrule_string (RFC 5545 RRULE, ör. 'FREQ=WEEKLY;BYDAY=MO,TH')
--   kullanılır. null = tekrar yok. Tek bir tekrarın istisnaları için
--   recurrence_exceptions (date[]) tutulur.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Yardımcı: updated_at tetikleyicisi
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- 1) profiles — her auth.users kaydı için bir profil
-- RLS: Kullanıcı kendi profilini okur/günceller; aktif eşleşmedeki
--      partnerinin profilini yalnızca okuyabilir. Ekleme tetikleyiciyle yapılır.
-- =====================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  couple_id     uuid,
  visibility    text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted    boolean not null default false,
  email         text,
  full_name     text,
  display_name  text
);

-- =====================================================================
-- 2) couples — iki kullanıcının ortak alanı
-- RLS: Yalnızca üyeler okuyabilir. Oluşturma/sonlandırma yalnızca
--      accept_invitation() ve end_couple() fonksiyonlarıyla yapılır.
-- =====================================================================
create table if not exists public.couples (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid,                         -- sözleşme gereği; id ile aynı değeri taşır
  photo_path  text,
  visibility  text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted  boolean not null default false,
  ended_at    timestamptz
);

alter table public.couples add column if not exists photo_path text;

alter table public.profiles drop constraint if exists profiles_couple_id_fkey;
alter table public.profiles add constraint profiles_couple_id_fkey foreign key (couple_id) references public.couples(id) on delete set null;

-- =====================================================================
-- 3) couple_members — çift üyelikleri (çift başına 2 satır)
-- RLS: Üye, kendi çiftinin üyelik satırlarını okuyabilir. Yazma yalnızca
--      SECURITY DEFINER fonksiyonlarla.
-- =====================================================================
create table if not exists public.couple_members (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid not null references public.couples(id) on delete cascade,
  visibility  text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted  boolean not null default false,
  user_id     uuid not null references auth.users(id) on delete cascade,
  unique (couple_id, user_id)
);
create index if not exists couple_members_user_idx on public.couple_members(user_id) where not is_deleted;

-- Yardımcı: oturumdaki kullanıcı bu çiftin aktif üyesi mi?
create or replace function public.is_couple_member(p_couple_id uuid, p_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.couple_members m
    join public.couples c on c.id = m.couple_id
    where m.couple_id = p_couple_id and m.user_id = p_user_id
      and not m.is_deleted and c.ended_at is null
  );
$$;

-- Ortak çift fotoğrafı özel Supabase Storage bucket'ında tutulur.
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

-- =====================================================================
-- 4) invitations — 6 haneli davet kodları
-- RLS: Davet eden kendi davetlerini okur, oluşturur ve iptal eder.
--      Kodla kabul/ret yalnızca accept_invitation()/reject_invitation() ile
--      (kodların listelenip tahmin edilmesini önlemek için).
-- =====================================================================
create table if not exists public.invitations (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  couple_id     uuid references public.couples(id) on delete set null,
  visibility    text not null default 'personal' check (visibility in ('personal','shared')),
  is_deleted    boolean not null default false,
  inviter_id    uuid not null references auth.users(id) on delete cascade,
  inviter_name  text,
  invitee_id    uuid references auth.users(id) on delete set null,
  code          char(6) not null,
  status        text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled'))
);
create unique index if not exists invitations_pending_code_idx on public.invitations(code) where status = 'pending';

-- =====================================================================
-- 5) screen_notes — partnerin ana ekranında görünen kısa notlar
-- RLS: Çiftin iki üyesi okuyabilir; yalnızca gönderen (owner) ekleyebilir.
-- =====================================================================
create table if not exists public.screen_notes (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  owner_id          uuid not null references auth.users(id) on delete cascade,
  couple_id         uuid references public.couples(id) on delete cascade,
  visibility        text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted        boolean not null default false,
  receiver_id       uuid references auth.users(id) on delete set null,
  text              text not null check (char_length(text) between 1 and 140),
  emoji             text,
  background_color  text,
  read_at           timestamptz
);
create index if not exists screen_notes_couple_idx on public.screen_notes(couple_id, created_at desc);

-- =====================================================================
-- 6) notifications — uygulama içi bildirimler
-- RLS: Kullanıcı yalnızca kendi (owner_id) bildirimlerini okur/günceller.
--      Ekleme: kendisine veya aynı aktif çiftteki partnerine.
-- =====================================================================
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid references public.couples(id) on delete cascade,
  visibility  text not null default 'personal' check (visibility in ('personal','shared')),
  is_deleted  boolean not null default false,
  category    text not null default 'system' check (category in ('system','invitation','couple','screen_note','event','task','reminder')),
  title       text not null,
  body        text,
  read_at     timestamptz
);
create index if not exists notifications_owner_idx on public.notifications(owner_id, created_at desc);

-- =====================================================================
-- 7) calendar_events — ortak/kişisel takvim etkinlikleri (Aşama 2)
-- RLS: İçerik politikası (aşağıda): sahibi her zaman; 'shared' ise çift üyeleri.
-- =====================================================================
create table if not exists public.calendar_events (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  owner_id               uuid not null references auth.users(id) on delete cascade,
  couple_id              uuid references public.couples(id) on delete cascade,
  visibility             text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted             boolean not null default false,
  title                  text not null,
  description            text,
  location               text,
  starts_at              timestamptz not null,
  ends_at                timestamptz,
  all_day                boolean not null default false,
  rrule_string           text,              -- ör. 'FREQ=YEARLY' ; null = tekrar yok
  recurrence_exceptions  date[] not null default '{}'
);

-- =====================================================================
-- 8) important_dates — yıl dönümü, doğum günü gibi özel günler (Aşama 2)
-- RLS: İçerik politikası.
-- =====================================================================
create table if not exists public.important_dates (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  couple_id       uuid references public.couples(id) on delete cascade,
  visibility      text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted      boolean not null default false,
  title           text not null,
  date            date not null,
  kind            text not null default 'other' check (kind in ('anniversary','birthday','other')),
  remind_days_before int not null default 1
);

-- =====================================================================
-- 8a) daily_songs — çiftin günün şarkısı
-- =====================================================================
create table if not exists public.daily_songs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid not null references public.couples(id) on delete cascade,
  song_date   date not null,
  title       text not null,
  artist      text not null,
  url         text not null check (url ~* '^https?://'),
  unique (couple_id, song_date)
);

-- =====================================================================
-- 9) lists — paylaşılan listeler (Aşama 2)
-- RLS: İçerik politikası.
-- =====================================================================
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid references public.couples(id) on delete cascade,
  visibility  text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted  boolean not null default false,
  title       text not null,
  kind        text not null default 'general' check (kind in ('general','grocery','movie','travel','wish')),
  icon        text
);

-- =====================================================================
-- 10) list_items — liste maddeleri (Aşama 2)
-- RLS: İçerik politikası (madde, listesiyle aynı couple_id/visibility'yi taşır).
-- =====================================================================
create table if not exists public.list_items (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  couple_id     uuid references public.couples(id) on delete cascade,
  visibility    text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted    boolean not null default false,
  list_id       uuid not null references public.lists(id) on delete cascade,
  content       text not null,
  is_checked    boolean not null default false,
  checked_by    uuid references auth.users(id) on delete set null,
  position      int not null default 0
);

-- =====================================================================
-- 11) note_folders — not klasörleri (Aşama 2)
-- RLS: İçerik politikası.
-- =====================================================================
create table if not exists public.note_folders (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid references public.couples(id) on delete cascade,
  visibility  text not null default 'personal' check (visibility in ('personal','shared')),
  is_deleted  boolean not null default false,
  name        text not null,
  parent_id   uuid references public.note_folders(id) on delete cascade
);

-- =====================================================================
-- 12) notes — kişisel/ortak notlar (Aşama 2)
-- RLS: İçerik politikası.
-- =====================================================================
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid references public.couples(id) on delete cascade,
  visibility  text not null default 'personal' check (visibility in ('personal','shared')),
  is_deleted  boolean not null default false,
  folder_id   uuid references public.note_folders(id) on delete set null,
  title       text not null,
  body        text,
  is_pinned   boolean not null default false
);

-- =====================================================================
-- 13) tasks — görevler (Aşama 2)
-- RLS: İçerik politikası; atanan kişi (assignee_id) de okuyabilir.
-- =====================================================================
create table if not exists public.tasks (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  owner_id               uuid not null references auth.users(id) on delete cascade,
  couple_id              uuid references public.couples(id) on delete cascade,
  visibility             text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted             boolean not null default false,
  title                  text not null,
  description            text,
  assignee_id            uuid references auth.users(id) on delete set null,
  due_at                 timestamptz,
  priority               text not null default 'normal' check (priority in ('low','normal','high')),
  completed_at           timestamptz,
  rrule_string           text,
  recurrence_exceptions  date[] not null default '{}'
);

-- =====================================================================
-- 14) reminders — "Unutma!" hatırlatmaları (Aşama 2)
-- RLS: İçerik politikası; target_user_id partner ise partner de okuyabilir.
-- =====================================================================
create table if not exists public.reminders (
  id                     uuid primary key default gen_random_uuid(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  owner_id               uuid not null references auth.users(id) on delete cascade,
  couple_id              uuid references public.couples(id) on delete cascade,
  visibility             text not null default 'personal' check (visibility in ('personal','shared')),
  is_deleted             boolean not null default false,
  title                  text not null,
  remind_at              timestamptz not null,
  target_user_id         uuid references auth.users(id) on delete set null,
  rrule_string           text,
  recurrence_exceptions  date[] not null default '{}',
  last_sent_at           timestamptz
);

-- =====================================================================
-- 15) gift_ideas — Hediye Radarı (Aşama 2)
-- RLS: HER ZAMAN yalnızca sahibi görür (partnerden gizli). visibility
--      'personal' olarak zorlanır; içerik politikası yerine özel politika.
-- =====================================================================
create table if not exists public.gift_ideas (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  couple_id     uuid references public.couples(id) on delete cascade,
  visibility    text not null default 'personal' check (visibility = 'personal'),
  is_deleted    boolean not null default false,
  title         text not null,
  url           text,
  price         numeric(12,2),
  occasion_id   uuid references public.important_dates(id) on delete set null,
  is_purchased  boolean not null default false
);

-- =====================================================================
-- 16) partner_facts — "Bilinmesi Gerekenler" (Aşama 2)
-- RLS: İçerik politikası (genellikle 'shared').
-- =====================================================================
create table if not exists public.partner_facts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid references public.couples(id) on delete cascade,
  visibility  text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted  boolean not null default false,
  about_user_id uuid references auth.users(id) on delete cascade,
  category    text not null default 'other' check (category in ('size','allergy','likes','dislikes','health','other')),
  label       text not null,
  value       text
);

-- =====================================================================
-- 17) user_settings — kullanıcı tercihleri ve push token (Aşama 2)
-- RLS: Yalnızca sahibi okur/yazar.
-- =====================================================================
create table if not exists public.user_settings (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  owner_id           uuid not null unique references auth.users(id) on delete cascade,
  couple_id          uuid references public.couples(id) on delete set null,
  visibility         text not null default 'personal' check (visibility = 'personal'),
  is_deleted         boolean not null default false,
  push_token         text,
  notify_screen_note boolean not null default true,
  notify_reminders   boolean not null default true,
  quiet_hours_start  time,
  quiet_hours_end    time,
  locale             text not null default 'tr-TR'
);

-- =====================================================================
-- 18) mood_entries — günlük ruh halleri (uygulamada aktif)
-- Her zaman ortak; yalnızca sahibi yazar, aktif partner okuyabilir.
-- Bu modül ortak içerik politikası döngüsüne EKLENMEMELİDİR:
-- ortak döngü partnerin güncellemesine izin verir.
-- =====================================================================
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

-- =====================================================================
-- 19) kisses — partner istediği zaman öpücük gönderir
-- =====================================================================
create table if not exists public.kisses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  partner_id  uuid not null references auth.users(id) on delete cascade,
  couple_id   uuid not null references public.couples(id) on delete cascade,
  local_date  date not null,
  constraint kisses_no_self_send check (owner_id <> partner_id)
);

-- =====================================================================
-- 20) travel_places — partnerlerin birlikte ziyaret ettiği yerler
-- =====================================================================
create table if not exists public.travel_places (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  city text not null check (char_length(city) between 1 and 120),
  country text not null check (char_length(country) between 1 and 120),
  note text check (note is null or char_length(note) <= 500),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  visited_on date not null default current_date
);
create index if not exists travel_places_couple_date_idx on public.travel_places(couple_id, visited_on desc);
alter table public.travel_places enable row level security;
grant select, insert, update, delete on table public.travel_places to authenticated;
drop policy if exists travel_places_select on public.travel_places;
create policy travel_places_select on public.travel_places for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists travel_places_insert on public.travel_places;
create policy travel_places_insert on public.travel_places for insert to authenticated with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists travel_places_update on public.travel_places;
create policy travel_places_update on public.travel_places for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists travel_places_delete on public.travel_places;
create policy travel_places_delete on public.travel_places for delete to authenticated using (owner_id = auth.uid() and public.is_couple_member(couple_id));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'travel_places') then
    alter publication supabase_realtime add table public.travel_places;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'calendar_events') then
    alter publication supabase_realtime add table public.calendar_events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'important_dates') then
    alter publication supabase_realtime add table public.important_dates;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'daily_songs') then
    alter publication supabase_realtime add table public.daily_songs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lists') then
    alter publication supabase_realtime add table public.lists;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_items') then
    alter publication supabase_realtime add table public.list_items;
  end if;
end $$;

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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'kisses'
  ) then
    alter publication supabase_realtime add table public.kisses;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- updated_at tetikleyicileri ve RLS'nin diğer tablolarda açılması
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','couples','couple_members','invitations','screen_notes','notifications',
    'calendar_events','important_dates','lists','list_items','note_folders','notes',
    'tasks','reminders','gift_ideas','partner_facts','user_settings'
  ] loop
    execute format('drop trigger if exists %I_updated_at on public.%I', t, t);
    execute format('create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- RLS politikaları — Aşama 1 tabloları
-- ---------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid()
  or exists (
    select 1 from public.couple_members me
    join public.couple_members other on other.couple_id = me.couple_id
    where me.user_id = auth.uid() and other.user_id = profiles.id
      and not me.is_deleted and not other.is_deleted
      and public.is_couple_member(me.couple_id)
  )
);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists couples_select on public.couples;
create policy couples_select on public.couples for select using (
  exists (select 1 from public.couple_members m where m.couple_id = couples.id and m.user_id = auth.uid())
);

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

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'couples'
  ) then
    alter publication supabase_realtime add table public.couples;
  end if;
end $$;

drop policy if exists couple_members_select on public.couple_members;
create policy couple_members_select on public.couple_members for select using (
  user_id = auth.uid() or public.is_couple_member(couple_id)
);

drop policy if exists invitations_select on public.invitations;
create policy invitations_select on public.invitations for select using (inviter_id = auth.uid() or invitee_id = auth.uid());
drop policy if exists invitations_insert on public.invitations;
create policy invitations_insert on public.invitations for insert with check (inviter_id = auth.uid() and owner_id = auth.uid());
drop policy if exists invitations_update on public.invitations;
create policy invitations_update on public.invitations for update using (inviter_id = auth.uid()) with check (inviter_id = auth.uid());

drop policy if exists screen_notes_select on public.screen_notes;
create policy screen_notes_select on public.screen_notes for select using (
  not is_deleted and (owner_id = auth.uid() or receiver_id = auth.uid() or public.is_couple_member(couple_id))
);
drop policy if exists screen_notes_insert on public.screen_notes;
create policy screen_notes_insert on public.screen_notes for insert with check (
  owner_id = auth.uid() and public.is_couple_member(couple_id) and public.is_couple_member(couple_id, receiver_id)
);
drop policy if exists screen_notes_update on public.screen_notes;
create policy screen_notes_update on public.screen_notes for update using (owner_id = auth.uid());

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (owner_id = auth.uid());
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications for insert with check (
  owner_id = auth.uid()
  or (couple_id is not null and public.is_couple_member(couple_id) and public.is_couple_member(couple_id, owner_id))
);
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

alter table public.daily_songs enable row level security;
drop policy if exists daily_songs_select on public.daily_songs;
create policy daily_songs_select on public.daily_songs for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists daily_songs_insert on public.daily_songs;
create policy daily_songs_insert on public.daily_songs for insert to authenticated with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists daily_songs_update on public.daily_songs;
create policy daily_songs_update on public.daily_songs for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists daily_songs_delete on public.daily_songs;
create policy daily_songs_delete on public.daily_songs for delete to authenticated using (owner_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, update, delete on public.daily_songs to authenticated;

-- ---------------------------------------------------------------------
-- RLS politikaları — Aşama 2 içerik tabloları (ortak "içerik politikası")
--   SELECT : silinmemiş VE (sahibi VEYA visibility='shared' ve aktif çift üyesi)
--   INSERT : owner_id = auth.uid() VE (couple_id null VEYA aktif çift üyesi)
--   UPDATE : sahibi VEYA (visibility='shared' ve aktif çift üyesi)
--   DELETE : yalnızca sahibi (istemci tercihen is_deleted=true ile yumuşak siler)
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'calendar_events','important_dates','lists','list_items','note_folders','notes',
    'tasks','reminders','partner_facts'
  ] loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format($p$create policy %I_select on public.%I for select using (
      not is_deleted and (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id))))$p$, t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format($p$create policy %I_insert on public.%I for insert with check (
      owner_id = auth.uid() and (couple_id is null or public.is_couple_member(couple_id)))$p$, t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format($p$create policy %I_update on public.%I for update using (
      owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)))$p$, t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);
    execute format('create policy %I_delete on public.%I for delete using (owner_id = auth.uid())', t, t);
  end loop;
end $$;

-- Görev atananı ve hatırlatma hedefi de kaydı görebilir.
drop policy if exists tasks_assignee_select on public.tasks;
create policy tasks_assignee_select on public.tasks for select using (not is_deleted and assignee_id = auth.uid());
drop policy if exists reminders_target_select on public.reminders;
create policy reminders_target_select on public.reminders for select using (not is_deleted and target_user_id = auth.uid());

-- Hediye Radarı ve kullanıcı ayarları: yalnızca sahibi.
drop policy if exists gift_ideas_owner on public.gift_ideas;
create policy gift_ideas_owner on public.gift_ideas for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists user_settings_owner on public.user_settings;
create policy user_settings_owner on public.user_settings for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- Yeni kullanıcı → profil tetikleyicisi
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_name text := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
begin
  insert into public.profiles (id, owner_id, email, full_name, display_name)
  values (new.id, new.id, new.email, v_name, split_part(v_name, ' ', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- RPC fonksiyonları (uygulamadaki servisler bunları çağırır)
-- ---------------------------------------------------------------------
create or replace function public.accept_invitation(p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_inv public.invitations;
  v_couple_id uuid;
  v_me uuid := auth.uid();
  v_my_name text;
begin
  if v_me is null then raise exception 'Oturum bulunamadı.'; end if;
  select * into v_inv from public.invitations where code = upper(p_code) and status = 'pending' for update;
  if not found then raise exception 'Bu koda ait geçerli bir davet bulunamadı.'; end if;
  if v_inv.inviter_id = v_me then raise exception 'Kendi davet kodunuzu kabul edemezsiniz.'; end if;
  if exists (select 1 from public.couple_members m join public.couples c on c.id = m.couple_id
             where m.user_id in (v_me, v_inv.inviter_id) and not m.is_deleted and c.ended_at is null) then
    raise exception 'Taraflardan biri zaten bir eşleşmeye sahip.';
  end if;

  insert into public.couples (owner_id) values (v_inv.inviter_id) returning id into v_couple_id;
  update public.couples set couple_id = v_couple_id where id = v_couple_id;
  insert into public.couple_members (owner_id, couple_id, user_id)
    values (v_inv.inviter_id, v_couple_id, v_inv.inviter_id), (v_me, v_couple_id, v_me);
  update public.invitations set status = 'accepted', invitee_id = v_me, couple_id = v_couple_id where id = v_inv.id;
  update public.profiles set couple_id = v_couple_id where id in (v_me, v_inv.inviter_id);

  select display_name into v_my_name from public.profiles where id = v_me;
  insert into public.notifications (owner_id, couple_id, category, title, body) values
    (v_inv.inviter_id, v_couple_id, 'couple', 'Eşleşme tamamlandı', coalesce(v_my_name, 'Partneriniz') || ' davetinizi kabul etti.'),
    (v_me, v_couple_id, 'couple', 'Eşleşme tamamlandı', coalesce(v_inv.inviter_name, 'Partneriniz') || ' ile artık ortak alanınızı kullanabilirsiniz.');
  return v_couple_id;
end;
$$;

create or replace function public.reject_invitation(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_inv public.invitations;
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.'; end if;
  update public.invitations set status = 'rejected', invitee_id = auth.uid()
    where code = upper(p_code) and status = 'pending' and inviter_id <> auth.uid()
    returning * into v_inv;
  if not found then raise exception 'Bu koda ait geçerli bir davet bulunamadı.'; end if;
  insert into public.notifications (owner_id, category, title, body)
    values (v_inv.inviter_id, 'invitation', 'Davet reddedildi', 'Gönderdiğiniz davet reddedildi.');
end;
$$;

create or replace function public.end_couple()
returns void language plpgsql security definer set search_path = public as $$
declare v_couple_id uuid; v_partner uuid;
begin
  select m.couple_id into v_couple_id from public.couple_members m join public.couples c on c.id = m.couple_id
    where m.user_id = auth.uid() and not m.is_deleted and c.ended_at is null limit 1;
  if v_couple_id is null then raise exception 'Aktif bir eşleşme bulunamadı.'; end if;
  select user_id into v_partner from public.couple_members where couple_id = v_couple_id and user_id <> auth.uid() limit 1;
  update public.couples set ended_at = now() where id = v_couple_id;
  update public.couple_members set is_deleted = true where couple_id = v_couple_id;
  update public.profiles set couple_id = null where couple_id = v_couple_id;
  if v_partner is not null then
    insert into public.notifications (owner_id, category, title, body)
      values (v_partner, 'couple', 'Eşleşme sonlandırıldı', 'Ortak alan erişimi kapatıldı.');
  end if;
end;
$$;

-- Kullanıcıyı ve (ON DELETE CASCADE ile) ona ait tüm verileri siler.
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.'; end if;
  perform public.end_couple() where exists (
    select 1 from public.couple_members m join public.couples c on c.id = m.couple_id
    where m.user_id = auth.uid() and not m.is_deleted and c.ended_at is null);
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.accept_invitation(text), public.reject_invitation(text),
  public.end_couple(), public.delete_my_account(), public.is_couple_member(uuid, uuid) to authenticated;

-- =====================================================================
-- GENİŞLETİLEBİLİRLİK NOTU
-- • Yeni bir modül eklerken ortak sütun sözleşmesini (id, created_at,
--   updated_at, owner_id, couple_id, visibility, is_deleted) koruyun; tablo
--   adını yukarıdaki iki DO bloğundaki dizilere eklemeniz updated_at
--   tetikleyicisini, RLS'yi ve ortak içerik politikasını otomatik uygular.
-- • Tekrarlayan her yeni kayıt türü rrule_string + recurrence_exceptions
--   çiftini kullanmalı; tekrarların açılımı istemcide (ör. rrule.js) veya bir
--   Edge Function'da yapılır, veritabanında yalnızca kural saklanır.
-- • Ek dosyalar için Supabase Storage'da `couple/<couple_id>/...` yol yapısı
--   ve aynı is_couple_member() kontrolüyle bir storage politikası önerilir.
-- • Push bildirimleri: user_settings.push_token + notifications tablosuna
--   eklenen satırları dinleyen bir Database Webhook / Edge Function.
-- • Realtime: screen_notes ve notifications tabloları
--   `alter publication supabase_realtime add table ...` ile canlı
--   güncellemeye açılabilir.
-- • Çoklu dil: kullanıcıya dönük metinler istemcide tutulur; veritabanı
--   yalnızca kategori kodlarını (ör. 'screen_note') saklar.
-- =====================================================================
-- Shared foreground location, phone pedometer counts, and relationship start time.
alter table public.couples add column if not exists relationship_started_at timestamptz;

create or replace function public.set_relationship_started_at(p_started_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare v_couple_id uuid;
begin
  if p_started_at > now() then raise exception 'Relationship start cannot be in the future'; end if;
  select couple_id into v_couple_id from public.couple_members
    where user_id = auth.uid() and not is_deleted limit 1;
  if v_couple_id is null or not public.is_couple_member(v_couple_id) then raise exception 'No active couple'; end if;
  update public.couples set relationship_started_at = p_started_at where id = v_couple_id;
end;
$$;
revoke all on function public.set_relationship_started_at(timestamptz) from public, anon;
grant execute on function public.set_relationship_started_at(timestamptz) to authenticated;

create table if not exists public.couple_live_locations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  heading double precision,
  updated_at timestamptz not null default now()
);
alter table public.couple_live_locations enable row level security;
drop policy if exists couple_live_locations_select on public.couple_live_locations;
create policy couple_live_locations_select on public.couple_live_locations for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists couple_live_locations_insert on public.couple_live_locations;
create policy couple_live_locations_insert on public.couple_live_locations for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_live_locations_update on public.couple_live_locations;
create policy couple_live_locations_update on public.couple_live_locations for update to authenticated
  using (user_id = auth.uid() and public.is_couple_member(couple_id))
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_live_locations_delete on public.couple_live_locations;
create policy couple_live_locations_delete on public.couple_live_locations for delete to authenticated using (user_id = auth.uid());

create table if not exists public.couple_daily_steps (
  couple_id uuid not null references public.couples(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  steps integer not null default 0 check (steps >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, local_date)
);
alter table public.couple_daily_steps enable row level security;
drop policy if exists couple_daily_steps_select on public.couple_daily_steps;
create policy couple_daily_steps_select on public.couple_daily_steps for select to authenticated
  using (public.is_couple_member(couple_id));
drop policy if exists couple_daily_steps_insert on public.couple_daily_steps;
create policy couple_daily_steps_insert on public.couple_daily_steps for insert to authenticated
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_daily_steps_update on public.couple_daily_steps;
create policy couple_daily_steps_update on public.couple_daily_steps for update to authenticated
  using (user_id = auth.uid() and public.is_couple_member(couple_id))
  with check (user_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, update, delete on public.couple_live_locations, public.couple_daily_steps to authenticated;

alter table public.screen_notes add column if not exists image_path text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('screen-note-stickers', 'screen-note-stickers', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists screen_note_stickers_select on storage.objects;
create policy screen_note_stickers_select on storage.objects for select to authenticated using (
  bucket_id = 'screen-note-stickers' and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists screen_note_stickers_insert on storage.objects;
create policy screen_note_stickers_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'screen-note-stickers' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists screen_note_stickers_delete on storage.objects;
create policy screen_note_stickers_delete on storage.objects for delete to authenticated using (
  bucket_id = 'screen-note-stickers' and (storage.foldername(name))[2] = auth.uid()::text
);

grant select, insert, update, delete on public.screen_notes to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='couple_live_locations') then
    alter publication supabase_realtime add table public.couple_live_locations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='couple_daily_steps') then
    alter publication supabase_realtime add table public.couple_daily_steps;
  end if;
end $$;
-- Share a direction-arrow opt-in separately from the foreground location used for step proximity.
alter table public.couple_live_locations
  add column if not exists direction_enabled boolean not null default false;

-- A sender can see when the recipient opened their screen note.
alter table public.screen_notes add column if not exists read_at timestamptz;

create or replace function public.mark_screen_note_read(p_note_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Oturum bulunamadı.'; end if;
  update public.screen_notes
    set read_at = coalesce(read_at, now())
    where id = p_note_id and receiver_id = auth.uid() and not is_deleted;
end;
$$;
revoke all on function public.mark_screen_note_read(uuid) from public, anon;
grant execute on function public.mark_screen_note_read(uuid) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'screen_notes'
  ) then
    alter publication supabase_realtime add table public.screen_notes;
  end if;
end $$;
create table if not exists public.couple_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  file_name text not null,
  display_name text not null,
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

create table if not exists public.couple_document_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) > 0),
  url text not null check (url ~* '^https?://')
);
create index if not exists couple_document_links_couple_created_idx on public.couple_document_links(couple_id, created_at desc);
alter table public.couple_document_links enable row level security;
drop policy if exists couple_document_links_select on public.couple_document_links;
create policy couple_document_links_select on public.couple_document_links for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists couple_document_links_insert on public.couple_document_links;
create policy couple_document_links_insert on public.couple_document_links for insert to authenticated with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_document_links_delete on public.couple_document_links;
create policy couple_document_links_delete on public.couple_document_links for delete to authenticated using (owner_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, delete on public.couple_document_links to authenticated;

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

create table if not exists public.couple_gallery_photos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  caption text,
  taken_at timestamptz not null default now(),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic')),
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 15728640)
);
create index if not exists couple_gallery_photos_couple_created_idx on public.couple_gallery_photos(couple_id, created_at desc);
alter table public.couple_gallery_photos enable row level security;
drop policy if exists couple_gallery_photos_select on public.couple_gallery_photos;
create policy couple_gallery_photos_select on public.couple_gallery_photos for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists couple_gallery_photos_insert on public.couple_gallery_photos;
create policy couple_gallery_photos_insert on public.couple_gallery_photos for insert to authenticated with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_gallery_photos_delete on public.couple_gallery_photos;
create policy couple_gallery_photos_delete on public.couple_gallery_photos for delete to authenticated using (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_gallery_photos_update on public.couple_gallery_photos;
create policy couple_gallery_photos_update on public.couple_gallery_photos for update to authenticated using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
grant select, insert, update, delete on public.couple_gallery_photos to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('couple-gallery', 'couple-gallery', false, 15728640, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists couple_gallery_storage_select on storage.objects;
create policy couple_gallery_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'couple-gallery' and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists couple_gallery_storage_insert on storage.objects;
create policy couple_gallery_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'couple-gallery' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
drop policy if exists couple_gallery_storage_delete on storage.objects;
create policy couple_gallery_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'couple-gallery' and (storage.foldername(name))[2] = auth.uid()::text
  and public.is_couple_member((storage.foldername(name))[1]::uuid)
);
create or replace function public.notify_kiss_partner_once_per_hour(
  p_partner_id uuid,
  p_couple_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_sender_id uuid := auth.uid();
begin
  if v_sender_id is null
    or p_partner_id = v_sender_id
    or not public.is_couple_member(p_couple_id, v_sender_id)
    or not public.is_couple_member(p_couple_id, p_partner_id) then
    raise exception 'Not allowed to notify this partner';
  end if;

  -- Serialize concurrent kiss events for the same recipient before checking the hour window.
  perform pg_advisory_xact_lock(hashtextextended(p_couple_id::text || ':' || p_partner_id::text || ':kiss', 0));

  if exists (
    select 1 from public.notifications n
    where n.owner_id = p_partner_id
      and n.couple_id = p_couple_id
      and n.category = 'couple'
      and n.title = 'Sana bir öpücük gönderdi'
      and n.created_at >= now() - interval '1 hour'
  ) then
    return false;
  end if;

  insert into public.notifications (owner_id, couple_id, category, title, body)
  values (p_partner_id, p_couple_id, 'couple', 'Sana bir öpücük gönderdi', 'Partnerin sana bir öpücük gönderdi. 💋');
  return true;
end;
$$;

revoke all on function public.notify_kiss_partner_once_per_hour(uuid, uuid) from public, anon;
grant execute on function public.notify_kiss_partner_once_per_hour(uuid, uuid) to authenticated;
