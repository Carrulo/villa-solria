-- 007_booking_invoice_details.sql
--
-- Captures B2B invoice details when a guest requests a proper company
-- invoice (typical for Spanish / Portuguese small businesses paying via
-- Booking.com). The host fills this in from a button in the booking
-- detail modal, and a banner on /admin/bookings reminds them to issue
-- the invoice on the checkout day.
--
-- Shape of `invoice_details`:
--   {
--     "company": "Beautiful Service Design SL",
--     "vat": "ESB85195147",
--     "address": "Avenida de Madrid 128 nave 36",
--     "postal_code": "28500",
--     "city": "Arganda del Rey",
--     "country": "ES",
--     "email": "facturas@example.com",
--     "issued_at": "2026-05-19T11:00:00Z"   -- set when admin marks as done
--   }

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS invoice_details JSONB DEFAULT NULL;

-- Partial index so the daily "facturas pendentes" query stays fast:
-- only need to look at rows where the guest actually asked for one.
CREATE INDEX IF NOT EXISTS bookings_invoice_pending_idx
  ON bookings (checkout_date)
  WHERE invoice_details IS NOT NULL
    AND (invoice_details ->> 'issued_at') IS NULL;

NOTIFY pgrst, 'reload schema';
