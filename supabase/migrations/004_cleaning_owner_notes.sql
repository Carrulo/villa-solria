-- Owner → cleaner communication on each cleaning task.
-- - owner_notes: free-text message Bruno leaves for the cleaning team
--   (e.g. "couple-only stay, leave Q2/Q3 with cobertor only").
-- - rooms_to_prepare: array of room numbers (1..villa_rooms). NULL means
--   "prepare every room" (default behaviour). When set, the cleaner UI
--   greys out rooms not in the list so the cleaner skips bedmaking there.

alter table public.cleaning_tasks
  add column if not exists owner_notes text,
  add column if not exists rooms_to_prepare integer[];

-- PostgREST schema cache must be refreshed so the JS client sees the new
-- columns immediately (otherwise "column does not exist" errors).
notify pgrst, 'reload schema';
