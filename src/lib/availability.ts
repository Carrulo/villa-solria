// The single answer to "are these nights free?".
//
// The villa has two independent sources of occupancy and they were being
// consulted separately, which is how nights ended up on sale twice:
//
//   `bookings`      — stays that came through the site, plus the ones the
//                     host typed in by hand.
//   `blocked_dates` — written by the iCal sync from the Airbnb, Booking
//                     and VRBO feeds. Channel reservations the host never
//                     turned into a `bookings` row exist ONLY here.
//
// /api/booking checked the first and not the second, so three channel
// stays were bookable through the site on 2026-09-17 — including 24 Dec
// to 1 Jan. /api/bookings/manual checked the second and not the first, so
// the admin could book straight over a live checkout hold, which the
// database would then reject with an unexplained 500.
//
// Both gates now come through here. Adding a third source means changing
// one function, not remembering to change two routes.

import type { createServerClient } from './supabase-server';

type Supabase = ReturnType<typeof createServerClient>;

/** Statuses that genuinely hold the calendar. */
const HOLDING_STATUSES = ['confirmed', 'pending_payment'] as const;

export type AvailabilityConflict =
  | {
      kind: 'booking';
      /** What the guest sees is the same either way; this is for the host. */
      detail: string;
    }
  | { kind: 'blocked'; detail: string };

export interface AvailabilityOptions {
  /**
   * Skip the `blocked_dates` half. Only for the admin enriching an
   * iCal-imported stay: those dates are blocked *by that very stay*, so
   * the host is attaching a booking row to something already on the
   * calendar rather than double-selling it. The `bookings` half still
   * runs — a second row for the same nights would be a real duplicate.
   */
  ignoreBlockedDates?: boolean;
  /** Ignore one booking, e.g. when editing it. */
  excludeBookingId?: string;
}

/**
 * Returns the first conflict found, or null when the nights are free.
 *
 * Ranges are half-open: a stay occupies the nights from `checkIn` up to
 * but not including `checkOut`, so one guest checking out on the morning
 * another checks in is not a conflict.
 */
export async function findAvailabilityConflict(
  supabase: Supabase,
  checkIn: string,
  checkOut: string,
  options: AvailabilityOptions = {}
): Promise<AvailabilityConflict | null> {
  let bookingQuery = supabase
    .from('bookings')
    .select('id, guest_name, checkin_date, checkout_date, status')
    .in('status', HOLDING_STATUSES as unknown as string[])
    .lt('checkin_date', checkOut)
    .gt('checkout_date', checkIn)
    .limit(1);

  if (options.excludeBookingId) {
    bookingQuery = bookingQuery.neq('id', options.excludeBookingId);
  }

  const { data: bookingHits } = await bookingQuery;
  if (bookingHits && bookingHits.length > 0) {
    const b = bookingHits[0];
    const who = b.guest_name || 'reserva';
    const held = b.status === 'pending_payment' ? ' (pagamento a decorrer)' : '';
    return {
      kind: 'booking',
      detail: `${who} · ${b.checkin_date} → ${b.checkout_date}${held}`,
    };
  }

  if (options.ignoreBlockedDates) return null;

  const { data: blockedHits } = await supabase
    .from('blocked_dates')
    .select('date, source')
    .gte('date', checkIn)
    .lt('date', checkOut)
    .limit(1);

  if (blockedHits && blockedHits.length > 0) {
    const d = blockedHits[0];
    return { kind: 'blocked', detail: `${d.date} · ${d.source || 'bloqueado'}` };
  }

  return null;
}
