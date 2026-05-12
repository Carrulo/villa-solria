-- 008_dedupe_booking_notifications.sql
--
-- The `notify_new_booking` trigger used to fire for every INSERT into
-- `bookings`, including the ones that come from the iCal-enrichment
-- flow (admin clicks "Criar e enviar guia" on a Booking.com/Airbnb/VRBO
-- reservation imported via iCal). The `notify_new_external_reservation`
-- trigger had already created a notification for that same stay when
-- the iCal sync inserted the cleaning_tasks row, so the bell ended up
-- with TWO entries per OTA reservation.
--
-- Fix: skip the bookings-trigger insert when `source` is an OTA
-- channel. Direct website / manual reservations still notify normally.

CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- iCal-enrichment writes preserve the OTA source ('booking', 'airbnb',
  -- 'vrbo' after normalisation; '*_ical' as legacy fallback). For those
  -- the external trigger has already created a notification.
  IF NEW.source IS NOT NULL AND lower(NEW.source) IN (
    'booking', 'airbnb', 'vrbo',
    'booking_ical', 'airbnb_ical', 'vrbo_ical'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (type, title, body, link)
  VALUES (
    'booking_new',
    'Nova reserva — ' || coalesce(NEW.guest_name, 'sem nome'),
    'De ' || NEW.checkin_date || ' a ' || NEW.checkout_date ||
      ' · ' || coalesce(NEW.total_price::text, '0') || '€' ||
      ' · origem: ' || coalesce(NEW.source, '—'),
    '/admin/bookings'
  );
  RETURN NEW;
END;
$$;
