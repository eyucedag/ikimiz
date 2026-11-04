-- =====================================================================
-- İkimiz — Supabase (PostgreSQL) şeması
-- Aşama 1: kimlik, eşleşme, ekran notları, bildirimler (uygulamada aktif)
-- Aşama 2: takvim, listeler, notlar, görevler, hatırlatmalar, hediye radarı,
--          bilinmesi gerekenler (tablolar hazır, arayüz sonraki aşamada)
--
-- Çalıştırma: Supabase Dashboard → SQL Editor → bu dosyanın tamamını
-- yapıştırıp "Run". Betik tekrar çalıştırılabilir (idempotent) olacak
-- şekilde yazılmıştır.
--
-- ORTAK SÜTUN SÖZLEŞMESİ (17 tablonun tamamında):
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
  visibility  text not null default 'shared' check (visibility in ('personal','shared')),
  is_deleted  boolean not null default false,
  ended_at    timestamptz
);

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
  background_color  text
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

-- ---------------------------------------------------------------------
-- updated_at tetikleyicileri ve RLS'nin tüm tablolarda açılması
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
