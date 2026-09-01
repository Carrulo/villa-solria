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

export function personHours(roomsPrepared: number): number {
  return COMMON_AREA_PERSON_HOURS + PER_ROOM_PERSON_HOURS * Math.max(0, roomsPrepared);
}

/** Wall-clock time with the usual pair working together. */
export function wallClockHours(roomsPrepared: number): number {
  return personHours(roomsPrepared) / CLEANERS;
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
export function labourCost(roomsPrepared: number, hourlyRate: number): number {
  return personHours(roomsPrepared) * hourlyRate;
}

/** The host's laundry table is keyed by how many rooms were used. */
export function laundryCost(
  roomsPrepared: number,
  table: Record<string, number>
): number {
  if (roomsPrepared <= 0) return 0;
  return Number(table[String(roomsPrepared)] ?? 0);
}
