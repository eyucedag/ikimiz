-- Eski sabah/akşam sınırlamasını kaldır; partnerler istedikleri zaman öpücük gönderebilsin.
alter table public.kisses drop constraint if exists kisses_owner_period_day_key;
alter table public.kisses drop column if exists period;
