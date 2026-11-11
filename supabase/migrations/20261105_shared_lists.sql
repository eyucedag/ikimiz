create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  visibility text not null default 'shared' check (visibility = 'shared'),
  is_deleted boolean not null default false,
  title text not null check (char_length(trim(title)) between 1 and 120),
  kind text not null default 'general' check (kind in ('general','grocery','movie','travel','wish')),
  icon text
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  couple_id uuid not null references public.couples(id) on delete cascade,
  visibility text not null default 'shared' check (visibility = 'shared'),
  is_deleted boolean not null default false,
  list_id uuid not null references public.lists(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 300),
  is_checked boolean not null default false,
  checked_by uuid references auth.users(id) on delete set null,
  position int not null default 0
);

create index if not exists lists_couple_created_idx on public.lists(couple_id, created_at desc) where not is_deleted;
create index if not exists list_items_list_position_idx on public.list_items(list_id, position, created_at) where not is_deleted;
alter table public.lists enable row level security;
alter table public.list_items enable row level security;

drop policy if exists lists_select on public.lists;
create policy lists_select on public.lists for select to authenticated
  using (not is_deleted and public.is_couple_member(couple_id));
drop policy if exists lists_insert on public.lists;
create policy lists_insert on public.lists for insert to authenticated
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists lists_update on public.lists;
create policy lists_update on public.lists for update to authenticated
  using (public.is_couple_member(couple_id)) with check (public.is_couple_member(couple_id));
drop policy if exists lists_delete on public.lists;
create policy lists_delete on public.lists for delete to authenticated
  using (owner_id = auth.uid() and public.is_couple_member(couple_id));

drop policy if exists list_items_select on public.list_items;
create policy list_items_select on public.list_items for select to authenticated
  using (not is_deleted and public.is_couple_member(couple_id));
drop policy if exists list_items_insert on public.list_items;
create policy list_items_insert on public.list_items for insert to authenticated
  with check (
    owner_id = auth.uid() and public.is_couple_member(couple_id)
    and exists (select 1 from public.lists l where l.id = list_items.list_id and l.couple_id = list_items.couple_id and not l.is_deleted)
  );
drop policy if exists list_items_update on public.list_items;
create policy list_items_update on public.list_items for update to authenticated
  using (public.is_couple_member(couple_id))
  with check (
    public.is_couple_member(couple_id)
    and exists (select 1 from public.lists l where l.id = list_items.list_id and l.couple_id = list_items.couple_id and not l.is_deleted)
  );
drop policy if exists list_items_delete on public.list_items;
create policy list_items_delete on public.list_items for delete to authenticated
  using (owner_id = auth.uid() and public.is_couple_member(couple_id));

grant select, insert, update, delete on public.lists, public.list_items to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'lists') then
    alter publication supabase_realtime add table public.lists;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'list_items') then
    alter publication supabase_realtime add table public.list_items;
  end if;
end $$;
