-- The cleaner is paid by the hour now, on the hours she reports after
-- the job — not on any estimate. `hours_worked` is what she said; the
-- payment is hours_worked * cleaner_hourly_rate, and the result keeps
-- being frozen into cleaning_fee_snapshot so past payments never move
-- when the rate changes.
--
-- Hours are total person-hours (the pair working 2h reports 4).

alter table public.cleaning_tasks
  add column if not exists hours_worked numeric(5, 2);

notify pgrst, 'reload schema';
