-- Ruh haline eklenen Yorgunum, Enerjik, Kızgın ve Sıkılmış seçeneklerini kabul et.
alter table public.mood_entries
  drop constraint if exists mood_entries_mood_check;

alter table public.mood_entries
  add constraint mood_entries_mood_check
  check (mood in ('great', 'good', 'okay', 'low', 'rough', 'tired', 'energetic', 'angry', 'bored'));
