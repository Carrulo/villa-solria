import { getTranslations } from 'next-intl/server';
import { Star } from 'lucide-react';
import { getChannelRatings } from '@/lib/channel-ratings';

/**
 * Server component that renders OTA platform badges as social proof.
 * Ratings and review counts come from `settings` via getChannelRatings(),
 * so they can be edited without a deploy.
 *
 * Badges are intentionally NOT linked — they are pure trust signals.
 * Linking out to Booking/Airbnb/VRBO would funnel commission-bearing
 * traffic away from the direct-booking site.
 *
 * Each platform keeps its own native scale (Booking 0-10, Airbnb and Vrbo
 * 0-5); showing the denominator avoids the "4.96 Airbnb vs 9.8 Booking"
 * optical illusion. The review count is what makes a score believable —
 * "9.8" alone could be two reviews.
 */
export default async function TrustBadges({
  variant = 'hero',
  align = 'center',
}: {
  variant?: 'hero' | 'compact';
  align?: 'center' | 'start';
}) {
  const [platforms, t] = await Promise.all([getChannelRatings(), getTranslations('channelRatings')]);
  const visible = platforms;
  if (visible.length === 0) return null;

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 flex-wrap justify-center ${align === 'start' ? 'sm:justify-start' : ''}`}>
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
            <span className="text-gray-500">
              {p.name}
              {p.count ? ` · ${t('reviews', { count: p.count })}` : ''}
            </span>
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
          <span className="text-white/70 text-xs">
            {p.name}
            {p.count ? ` · ${t('reviews', { count: p.count })}` : ''}
          </span>
        </div>
      ))}
    </div>
  );
}
