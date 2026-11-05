drop trigger if exists couple_question_answer_notify
  on public.couple_question_answers;

drop function if exists public.notify_couple_question_answer();

drop table if exists public.couple_question_answers;
