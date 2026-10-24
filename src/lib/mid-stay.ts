// Weekly cleanings during long stays — an optional extra the guest adds
// when booking, priced per cleaning (seasons.mid_stay_cleaning_fee).
//
// Until 24 Oct 2026 these were "included" on every stay of 14+ nights:
// a 58-night stay showed eight free cleanings, worth ~640 € of the
// cleaner's time and laundry, on top of the 15% monthly discount — and
// none of them was ever scheduled, because the server ignored the
// choice. Bruno turned it into an upsell: the exit cleaning is always
// charged, weekly cleanings are offered and paid for if wanted.
//
// Shared by the booking form (what the guest sees) and /api/booking
// (what is charged), so the two cannot drift apart.

/** A cleaning this close to checkout is pointless — the exit clean follows. */
const MIN_DAYS_BEFORE_CHECKOUT = 3;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Dates of the weekly cleanings for a stay: every 7 days from check-in,
 * dropping any that would fall within 3 days of checkout. A 58-night stay
 * gets 7 (day 56 is two days before leaving), not floor(58/7) = 8.
 */
export function midStayCleaningDates(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const lastUseful = addDays(checkOut, -MIN_DAYS_BEFORE_CHECKOUT);
  for (let day = 7; ; day += 7) {
    const date = addDays(checkIn, day);
    if (date > lastUseful) break;
    dates.push(date);
  }
  return dates;
}

/** Whether the stay is long enough to be offered weekly cleanings. */
export function offersMidStayCleaning(nights: number, threshold: number | null | undefined): boolean {
  return nights >= (threshold ?? 14);
}
