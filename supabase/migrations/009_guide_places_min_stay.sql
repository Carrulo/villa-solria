-- 009_guide_places_min_stay.sql
--
-- Adds a per-place minimum stay length so hotel-related perks (the
-- AP Cabanas boat pier + the two hotel restaurants) only appear in
-- the guest guide for stays of 3+ nights. Short stays (1-2 nights)
-- aren't worth the back-and-forth with the hotel manager and shouldn't
-- raise expectations the host doesn't want to fulfil.

ALTER TABLE guide_places
  ADD COLUMN IF NOT EXISTS min_stay_nights INT DEFAULT 0;

-- Backfill: hotel perks require 3+ nights.
UPDATE guide_places
SET min_stay_nights = 3
WHERE name IN (
  'Ria — Restaurante do Hotel AP Cabanas',
  'Flor de Sal — Buffet do Hotel AP Cabanas',
  'Barco p/ Cabanas — Embarcadouro AP Hotel'
);

NOTIFY pgrst, 'reload schema';
