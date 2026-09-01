// What a cleaning plan costs, so the trade-off is visible while the host
// is choosing rooms rather than after the invoice.
//
// Baseline from the cleaner herself: the whole house takes 2 people × 2h
// = 4 person-hours. That covers 3 bedrooms plus the common areas — two
// bathrooms, small kitchen, living room, dining room, balcony, terrace.
// Splitting it: a bedroom is ~30 person-minutes (strip, remake, dust,
// floor), which leaves the common areas at 2.5 person-hours. They don't
// shrink when a bedroom is skipped.

export const CLEANERS = 2;
export const COMMON_AREA_PERSON_HOURS = 2.5;
export const PER_ROOM_PERSON_HOURS = 0.5;

// A mid-stay intervention is a different job: linen and towels swapped,
// the two bathrooms cleaned, nothing else — the guests' things stay put.
// First guess until the cleaner's own reported hours say otherwise.
export const MIDSTAY_BATHROOMS_PERSON_HOURS = 0.75;
export const MIDSTAY_PER_ROOM_PERSON_HOURS = 0.25;

export function personHours(
  roomsPrepared: number,
  kind: 'turnover' | 'midstay' = 'turnover'
): number {
  const rooms = Math.max(0, roomsPrepared);
  if (kind === 'midstay') {
    return MIDSTAY_BATHROOMS_PERSON_HOURS + MIDSTAY_PER_ROOM_PERSON_HOURS * rooms;
  }
  return COMMON_AREA_PERSON_HOURS + PER_ROOM_PERSON_HOURS * rooms;
}

/** Wall-clock time with the usual pair working together. */
export function wallClockHours(
  roomsPrepared: number,
  kind: 'turnover' | 'midstay' = 'turnover'
): number {
  return personHours(roomsPrepared, kind) / CLEANERS;
}

/** 3.5 → "3h30" · 2 → "2h" */
export function formatHours(hours: number): string {
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  if (minutes === 0) return `${whole}h`;
  return `${whole}h${String(minutes).padStart(2, '0')}`;
}

/**
 * Labour at the agreed hourly rate. The rate is per cleaner, so the pair
 * working 2h bills 4 person-hours.
 */
export function labourCost(
  roomsPrepared: number,
  hourlyRate: number,
  kind: 'turnover' | 'midstay' = 'turnover'
): number {
  return personHours(roomsPrepared, kind) * hourlyRate;
}

// The laundry charges by weight, so the bill follows what actually goes
// in the bag: bed linen for the rooms that were slept in, plus towels.
// Only sheets and towels go out — duvets, pillows and blankets stay.
//
// Calibrated against the host's own figure: the whole house (3 rooms of
// linen + towels for 6) comes to about 25 € with VAT at 3,50 €/kg.
export const LINEN_KG_PER_ROOM = 1.4;
export const KG_PER_TOWEL = 0.25;

export function laundryKg(roomsWashed: number, towels: number): number {
  return LINEN_KG_PER_ROOM * Math.max(0, roomsWashed) + KG_PER_TOWEL * Math.max(0, towels);
}

/** Estimated laundry bill, VAT included. */
export function laundryByWeight(
  roomsWashed: number,
  towels: number,
  pricePerKg: number,
  vatPercent: number
): number {
  return laundryKg(roomsWashed, towels) * pricePerKg * (1 + vatPercent / 100);
}

/** Legacy: flat table keyed by rooms, from when the cleaner did the washing. */
export function laundryCost(
  roomsPrepared: number,
  table: Record<string, number>
): number {
  if (roomsPrepared <= 0) return 0;
  return Number(table[String(roomsPrepared)] ?? 0);
}
