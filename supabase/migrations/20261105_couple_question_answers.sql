create table if not exists public.couple_question_answers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  couple_id uuid not null references public.couples(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  answer text not null check (length(btrim(answer)) between 1 and 1000),
  unique (couple_id, question_id, owner_id)
);

create index if not exists couple_question_answers_couple_updated_idx
  on public.couple_question_answers(couple_id, updated_at desc);

alter table public.couple_question_answers enable row level security;
drop policy if exists couple_question_answers_select on public.couple_question_answers;
create policy couple_question_answers_select on public.couple_question_answers
  for select to authenticated using (public.is_couple_member(couple_id));
drop policy if exists couple_question_answers_insert on public.couple_question_answers;
create policy couple_question_answers_insert on public.couple_question_answers
  for insert to authenticated with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
drop policy if exists couple_question_answers_update on public.couple_question_answers;
create policy couple_question_answers_update on public.couple_question_answers
  for update to authenticated using (owner_id = auth.uid() and public.is_couple_member(couple_id))
  with check (owner_id = auth.uid() and public.is_couple_member(couple_id));
grant select, insert, update on public.couple_question_answers to authenticated;

create or replace function public.notify_couple_question_answer()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_partner_id uuid;
begin
  select user_id into v_partner_id from public.couple_members
    where couple_id = new.couple_id and user_id <> new.owner_id and not is_deleted
    limit 1;
  if v_partner_id is not null and (tg_op = 'INSERT' or new.answer is distinct from old.answer) then
    insert into public.notifications (owner_id, couple_id, category, title, body)
    values (v_partner_id, new.couple_id, 'couple', 'Yeni bir yanıt paylaşıldı',
      'Partnerin Birbirimizi Tanıyalım bölümünde bir soruyu yanıtladı.');
  end if;
  return new;
end;
$$;
drop trigger if exists couple_question_answer_notify on public.couple_question_answers;
create trigger couple_question_answer_notify
  after insert or update of answer on public.couple_question_answers
  for each row execute function public.notify_couple_question_answer();
