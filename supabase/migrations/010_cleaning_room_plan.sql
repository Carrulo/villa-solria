-- How the guests actually spread across the house, per cleaning task.
--
-- `rooms_to_prepare` only says WHICH rooms get made up. It can't say a
-- family of four sleeps 2+1+1, which is what decides how many beds the
-- cleaner makes in the twin room and how many towels she carries. So:
--
-- - room_plan: {"1": 2, "2": 1, "3": 1} — people per room number. Rooms
--   absent or 0 are not prepared. NULL = fall back to rooms_to_prepare
--   (and, failing that, prepare every room).
-- - towels_override: total towels when it isn't simply one per guest —
--   e.g. 2 rooms but 3 towels. NULL = derive from room_plan.

alter table public.cleaning_tasks
  add column if not exists room_plan jsonb,
  add column if not exists towels_override integer;

-- PostgREST schema cache must be refreshed so the JS client sees the new
-- columns immediately (otherwise "column does not exist" errors).
notify pgrst, 'reload schema';
