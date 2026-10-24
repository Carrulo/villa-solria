// Ratings the villa holds on the booking channels, shown on the site as
// social proof. One source for every badge: they used to be typed into
// the homepage, the pricing page and the translation files separately,
// which is how "9.8/10 · 5+ Avaliações" and a 4.96 Airbnb score that no
// longer matched the listing (4.9 from 10 reviews on 24 Oct 2026) ended up
// on the site. Edit in /admin/settings → "Notas nas plataformas".
//
// Badges are not linked to the listings on purpose: sending visitors to
// Booking or Airbnb hands the booking to a channel that charges commission.

import { createServerClient } from './supabase-server';

export interface ChannelRating {
  name: string;
  rating: string;
  scale: number;
  /** Number of reviews behind the score; null when not filled in. */
  count: number | null;
}

const CHANNELS = [
  { name: 'Booking.com', ratingKey: 'booking_rating', countKey: 'booking_review_count', scale: 10 },
  { name: 'Airbnb', ratingKey: 'airbnb_rating', countKey: 'airbnb_review_count', scale: 5 },
  { name: 'Vrbo', ratingKey: 'vrbo_rating', countKey: 'vrbo_review_count', scale: 5 },
] as const;

/** Channels with a rating set, in display order. Never throws. */
export async function getChannelRatings(): Promise<ChannelRating[]> {
  const values: Record<string, string> = {};
  try {
    const { data } = await createServerClient()
      .from('settings')
      .select('key, value')
      .in('key', CHANNELS.flatMap((c) => [c.ratingKey, c.countKey]));
    for (const row of data ?? []) {
      values[row.key] = row.value === null || row.value === undefined ? '' : String(row.value).trim();
    }
  } catch {
    // Settings unreachable: show no badges rather than break the page.
  }

  return CHANNELS.flatMap((c) => {
    const rating = values[c.ratingKey];
    if (!rating) return [];
    const count = Number.parseInt(values[c.countKey] ?? '', 10);
    return [{ name: c.name, rating, scale: c.scale, count: count > 0 ? count : null }];
  });
}
