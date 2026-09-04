-- Last line of defence against double booking.
--
-- The availability check in /api/booking only blocks on 'confirmed' and
-- 'pending_payment', which is right — an abandoned checkout must not hold
-- dates. The cost is that two guests can sit in Stripe Checkout for the
-- same nights at once, and nothing stopped both from being confirmed:
-- fulfillBooking wrote 'confirmed' without re-reading the calendar.
--
-- Application code cannot close that race reliably; two concurrent
-- transactions each see a free calendar. An exclusion constraint can,
-- because the check happens in the storage engine.
--
-- daterange() is half-open [), so a checkout on the same day as the next
-- check-in does NOT count as an overlap — which is how the villa runs.

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (daterange(checkin_date, checkout_date) with &&)
  where (status in ('confirmed', 'pending_payment'));
