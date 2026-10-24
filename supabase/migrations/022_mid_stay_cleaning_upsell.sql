-- 2026-10-24. Weekly cleanings on long stays become a paid extra the
-- guest opts into when booking (they were shown as "included" and never
-- scheduled). The booking keeps what was bought so the Stripe checkout can
-- itemise it and the webhook can schedule the cleaner.
alter table public.bookings
  add column if not exists mid_stay_cleanings integer not null default 0,
  add column if not exists mid_stay_cleaning_total numeric not null default 0;

-- Bruno, 24 Oct: exit cleaning always charged at 120 € (the 90 € seasons
-- go up; 125 € high season left as is), weekly cleanings at 100 €.
update public.seasons set cleaning_fee = 120 where end_date >= '2026-10-24' and cleaning_fee = 90;
update public.seasons set mid_stay_cleaning_fee = 100 where end_date >= '2026-10-24';

notify pgrst, 'reload schema';
