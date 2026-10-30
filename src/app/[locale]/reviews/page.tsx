import { pageMetadata } from '@/lib/seo';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { getChannelRatings } from '@/lib/channel-ratings';
import { Star } from 'lucide-react';
import ReviewCard from '@/components/ReviewCard';
import { createServerClient } from '@/lib/supabase-server';
import type { Review } from '@/lib/supabase';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return pageMetadata(locale, '/reviews', t('reviewsTitle'), t('reviewsDescription'));
}

export default async function ReviewsPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'reviews' });

  // Fetch reviews from Supabase
  const supabase = createServerClient();
  const { data: dbReviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('visible', true)
    .order('created_at', { ascending: false });

  // Reviews stored in the DB first, then the translated ones from Booking
  // that the site has always shown. These used to vanish as soon as the
  // table held a single row — the first review a guest left on the site
  // would have replaced all three.
  type ShownReview = { name: string; country: string; text: string; rating: string; source?: string; verifiedLabel?: string };
  const fromDb: ShownReview[] = ((dbReviews || []) as Review[]).map((r) => ({
    name: r.guest_name,
    country: r.guest_country,
    text: r.comment,
    rating: String(r.rating),
    source: r.source,
    verifiedLabel: r.verified ? t('verifiedStay') : undefined,
  }));
  const fallback: ShownReview[] = [
    { name: t('review1Name'), country: t('review1Country'), text: t('review1Text'), rating: t('review1Rating') },
    { name: t('review2Name'), country: t('review2Country'), text: t('review2Text'), rating: t('review2Rating') },
    { name: t('review3Name'), country: t('review3Country'), text: t('review3Text'), rating: t('review3Rating') },
  ];
  const reviews = [...fromDb, ...fallback.filter((f) => !fromDb.some((d) => d.name === f.name))];

  // The badge is labelled Booking.com, so it shows Booking's own score.
  // It used to average the reviews stored here — a mix of Booking, Airbnb
  // and Facebook on different scales — under that label.
  const tRatings = await getTranslations({ locale, namespace: 'channelRatings' });
  const bookingScore = (await getChannelRatings()).find((c) => c.name === 'Booking.com');
  const avgRating = bookingScore?.rating ?? '9.8';

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500 mb-6">{t('subtitle')}</p>

          {/* Rating Badge */}
          <div className="inline-flex items-center gap-4 bg-white rounded-2xl px-8 py-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary mb-1">{avgRating}</div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={14} className="text-accent fill-accent" />
                ))}
              </div>
            </div>
            <div className="h-12 w-px bg-gray-200" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Booking.com</p>
              <p className="text-xs text-gray-500">
                {bookingScore?.count ? `${avgRating}/10 · ${tRatings('reviews', { count: bookingScore.count })}` : t('rating')}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {reviews.map((review, i) => (
            <ReviewCard key={`${review.name}-${i}`} {...review} />
          ))}
        </div>
      </div>
    </div>
  );
}
