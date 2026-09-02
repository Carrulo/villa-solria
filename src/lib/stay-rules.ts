// Stay rules per season, in one place so the form and the API agree.
//
// High season is sold Saturday to Saturday, seven nights. The form
// enforced the minimum, but the API enforced nothing: a request posted
// straight to it booked a single Friday night in August. Anything the
// UI merely hides has to be refused here as well.

export interface StayRuleSeason {
  name?: string | null;
  /** When false the season sells with no length or weekday restriction. */
  enforce_stay_rules?: boolean | null;
  min_nights: number | null;
  /** 0 = Sunday … 6 = Saturday. Empty/null means any day. */
  allowed_checkin_days: number[] | null;
}

export type StayRuleViolation =
  | { code: 'min_nights'; required: number; got: number }
  | { code: 'checkin_day'; allowed: number[]; got: number }
  | { code: 'checkout_day'; allowed: number[]; got: number };

/** Weekday of a YYYY-MM-DD date, read in UTC to dodge timezone drift. */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

const WEEKDAY_NAMES = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
];

export function weekdayName(day: number): string {
  return WEEKDAY_NAMES[day] ?? String(day);
}

/**
 * Checks a stay against the season the guest arrives in. Returns null
 * when the stay is allowed.
 *
 * When a season restricts arrivals to particular days, departures are
 * held to the same days: that is what makes a seven-night season run
 * Saturday to Saturday instead of leaving four-night orphans behind.
 */
export function checkStayRules(
  season: StayRuleSeason,
  checkIn: string,
  checkOut: string,
  nights: number
): StayRuleViolation | null {
  // The host can switch the rules off for a season — to sell a gap week,
  // or a shoulder period where any stay is welcome.
  if (season.enforce_stay_rules === false) return null;

  const minNights = Number(season.min_nights) || 1;
  if (nights < minNights) {
    return { code: 'min_nights', required: minNights, got: nights };
  }

  const allowed = Array.isArray(season.allowed_checkin_days)
    ? season.allowed_checkin_days
    : [];
  const restricted = allowed.length > 0 && allowed.length < 7;
  if (!restricted) return null;

  const inDay = weekdayOf(checkIn);
  if (!allowed.includes(inDay)) {
    return { code: 'checkin_day', allowed, got: inDay };
  }

  const outDay = weekdayOf(checkOut);
  if (!allowed.includes(outDay)) {
    return { code: 'checkout_day', allowed, got: outDay };
  }

  return null;
}

/** Human-readable reason, for the API response and the form. */
export function describeViolation(v: StayRuleViolation): string {
  if (v.code === 'min_nights') {
    return `Esta época exige um mínimo de ${v.required} noite${
      v.required === 1 ? '' : 's'
    } (pediu ${v.got}).`;
  }
  const days = v.allowed.map(weekdayName).join(' ou ');
  if (v.code === 'checkin_day') {
    return `Nesta época a entrada é só ao ${days} (pediu ${weekdayName(v.got)}).`;
  }
  return `Nesta época a saída é só ao ${days} (pediu ${weekdayName(v.got)}).`;
}
