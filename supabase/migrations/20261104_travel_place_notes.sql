-- Gezilen yer kayıtlarına partnerlerin ortak göreceği isteğe bağlı anı notu ekler.
alter table if exists public.travel_places
  add column if not exists note text check (note is null or char_length(note) <= 500);
