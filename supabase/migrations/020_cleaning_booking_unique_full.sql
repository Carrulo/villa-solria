-- 2026-10-03. The Stripe webhook creates a site booking's cleaning task
-- with upsert(..., { onConflict: 'booking_id' }). Postgres only accepts
-- ON CONFLICT (booking_id) against a non-partial unique index, and the
-- one we had was `WHERE booking_id IS NOT NULL` — so the upsert failed
-- with 42P10 and supabase-js swallowed it: paid site bookings got no
-- cleaning task. NULLs never collide in a unique index, so the predicate
-- was buying nothing; iCal-only rows (booking_id null) are unaffected.
create unique index if not exists cleaning_tasks_booking_id_key
  on public.cleaning_tasks (booking_id);
drop index if exists public.cleaning_tasks_booking_unique;
