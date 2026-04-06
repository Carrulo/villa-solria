import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
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
  return { title: t('reviewsTitle'), description: t('reviewsDescription') };
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

  // Use DB reviews if available, otherwise fallback to translated hardcoded ones
  const reviews: { name: string; country: string; text: string; rating: string }[] =
    dbReviews && dbReviews.length > 0
      ? (dbReviews as Review[]).map((r) => ({
          name: r.guest_name,
          country: r.country,
          text: r.comment,
          rating: String(r.rating),
        }))
      : [
          { name: t('review1Name'), country: t('review1Country'), text: t('review1Text'), rating: t('review1Rating') },
          { name: t('review2Name'), country: t('review2Country'), text: t('review2Text'), rating: t('review2Rating') },
          { name: t('review3Name'), country: t('review3Country'), text: t('review3Text'), rating: t('review3Rating') },
        ];

  // Calculate average rating
  const avgRating =
    dbReviews && dbReviews.length > 0
      ? ((dbReviews as Review[]).reduce((sum, r) => sum + r.rating, 0) / dbReviews.length).toFixed(1)
      : '9.4';

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
              <p className="text-xs text-gray-500">{t('rating')}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {reviews.map((review) => (
            <ReviewCard key={review.name} {...review} />
          ))}
        </div>
      </div>
    </div>
  );
}
