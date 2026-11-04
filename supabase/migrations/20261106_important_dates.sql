create table if not exists public.important_dates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  visibility text not null default 'shared' check (visibility in ('personal', 'shared')),
  is_deleted boolean not null default false,
  title text not null,
  date date not null,
  kind text not null default 'other' check (kind in ('anniversary', 'birthday', 'other')),
  remind_days_before integer not null default 1
);

create index if not exists important_dates_couple_date_idx
  on public.important_dates(couple_id, date) where is_deleted = false;

alter table public.important_dates enable row level security;
drop policy if exists important_dates_select on public.important_dates;
create policy important_dates_select on public.important_dates for select to authenticated
  using (not is_deleted and (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id))));
drop policy if exists important_dates_insert on public.important_dates;
create policy important_dates_insert on public.important_dates for insert to authenticated
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists important_dates_update on public.important_dates;
create policy important_dates_update on public.important_dates for update to authenticated
  using (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)))
  with check (owner_id = auth.uid() or (visibility = 'shared' and public.is_couple_member(couple_id)));
drop policy if exists important_dates_delete on public.important_dates;
create policy important_dates_delete on public.important_dates for delete to authenticated using (owner_id = auth.uid());

grant select, insert, update, delete on public.important_dates to authenticated;
