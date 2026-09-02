-- The anon policy on `settings` only hid credential-shaped keys
-- (api_key|_token|_secret|password|credential|_pat|service_role), so
-- everything else was world-readable through the anon key — including
-- `cleaner_name`, `cleaner_phone` and `cleaner_hourly_rate`, i.e. the
-- cleaner's personal contact and what she is paid, plus the laundry's
-- cost per kg.
--
-- Guest-facing prices (`cleaning_fee`, `mid_stay_cleaning_fee`) must stay
-- readable: the public pricing page and the booking form need them.

drop policy if exists "Anon read safe settings" on public.settings;

create policy "Anon read safe settings" on public.settings
  for select
  using (
    key !~ '(api_key|_token|_secret|password|credential|_pat|service_role)'
    -- Cleaner identity, contact and pay rate.
    and key !~ '^cleaner_'
    -- Laundry costs the host pays; nothing guest-facing.
    and key !~ '^laundry_'
    -- What the cleaning team is paid, as opposed to what a guest pays.
    and key <> 'cleaning_base_fee'
  );
