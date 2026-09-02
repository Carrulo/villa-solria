-- Whether a season's stay rules are actually enforced.
--
-- The rules themselves (min_nights, allowed_checkin_days) already
-- existed, but only the booking form respected them. Now that the API
-- refuses stays that break them, the host needs a switch: high season is
-- Saturday-to-Saturday seven nights as a rule, and there are weeks —
-- a gap between two bookings, a late shoulder week — where he wants to
-- take whatever comes.

alter table public.seasons
  add column if not exists enforce_stay_rules boolean not null default true;

notify pgrst, 'reload schema';
