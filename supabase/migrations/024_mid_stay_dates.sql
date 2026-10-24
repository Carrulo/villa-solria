-- 2026-10-24. The guest now picks which weeks get a cleaning (one of three,
-- say), not just whether to have them. Keep the chosen dates so the
-- webhook schedules exactly those.
alter table public.bookings add column if not exists mid_stay_dates date[];
notify pgrst, 'reload schema';
