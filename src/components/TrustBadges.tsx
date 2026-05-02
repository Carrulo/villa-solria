import { createClient } from '@supabase/supabase-js';
import { Star } from 'lucide-react';

interface PlatformBadge {
  name: string;
  rating?: string;
  scale: number;
  show: boolean;
}

/**
 * Server component that renders OTA platform badges as social proof.
 * Reads ratings/visibility from the Supabase `settings` table so the
 * marketing copy can be edited without a deploy.
 *
 * Badges are intentionally NOT linked — they are pure trust signals.
 * Linking out to Booking/Airbnb/VRBO would funnel commission-bearing
 * traffic away from the direct-booking site.
 */
export default async function TrustBadges({ variant = 'hero' }: { variant?: 'hero' | 'compact' }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let bookingRating = '9.8';
  let airbnbRating = '';
  let vrboRating = '';

  if (supabaseUrl && supabaseKey) {
    try {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { data } = await sb
        .from('settings')
        .select('key, value')
        .in('key', ['booking_rating', 'airbnb_rating', 'vrbo_rating']);

      if (data) {
        for (const row of data) {
          // settings.value is jsonb — can be number or string in the row
          const raw = row.value;
          const v = raw === null || raw === undefined ? '' : String(raw);
          if (row.key === 'booking_rating' && v) bookingRating = v;
          if (row.key === 'airbnb_rating') airbnbRating = v;
          if (row.key === 'vrbo_rating') vrboRating = v;
        }
      }
    } catch { /* settings optional */ }
  }

  // Each platform uses its own native rating scale — Booking is 0-10,
  // Airbnb and Vrbo are 0-5. Showing the denominator avoids the
  // "4.96 Airbnb vs 9.8 Booking" optical illusion.
  const platforms: PlatformBadge[] = [
    { name: 'Booking.com', rating: bookingRating, scale: 10, show: !!bookingRating },
    { name: 'Airbnb', rating: airbnbRating, scale: 5, show: !!airbnbRating },
    { name: 'Vrbo', rating: vrboRating, scale: 5, show: !!vrboRating },
  ];

  const visible = platforms.filter((p) => p.show);
  if (visible.length === 0) return null;

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {visible.map((p) => (
          <span
            key={p.name}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs"
          >
            <Star size={11} className="text-accent fill-accent" />
            <span className="font-semibold">
              {p.rating}
              <span className="text-gray-400 font-normal">/{p.scale}</span>
            </span>
            <span className="text-gray-500">{p.name}</span>
          </span>
        ))}
      </div>
    );
  }

  // hero variant
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
      {visible.map((p) => (
        <div
          key={p.name}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full"
        >
          <Star size={12} className="text-sand fill-sand" />
          <span className="text-white text-xs font-semibold">
            {p.rating}
            <span className="text-white/60 font-normal">/{p.scale}</span>
          </span>
          <span className="text-white/70 text-xs">{p.name}</span>
        </div>
      ))}
    </div>
  );
}
