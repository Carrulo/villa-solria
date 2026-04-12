import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { BedDouble, Users, Waves, Umbrella, Star, ArrowRight, BadgePercent, User, Clock, MessageCircle } from 'lucide-react';
import ReviewCard from '@/components/ReviewCard';
import EmailCapture from '@/components/EmailCapture';
import { createServerClient } from '@/lib/supabase-server';
import type { Review, Photo } from '@/lib/supabase';
import { getPhotoUrl } from '@/lib/supabase';

function JsonLd({
  ratingValue,
  ratingCount,
  lowPrice,
  highPrice,
  seasonCount,
}: {
  ratingValue: string;
  ratingCount: string;
  lowPrice: string | null;
  highPrice: string | null;
  seasonCount: number;
}) {
  const structuredData: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: 'Villa Solria',
    description: 'Duplex villa with 3 bedrooms and Ria Formosa views in Cabanas de Tavira, Algarve',
    url: 'https://villa-solria.vercel.app',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rua do Junco 3.5B',
      addressLocality: 'Tavira',
      postalCode: '8800-591',
      addressCountry: 'PT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.1353,
      longitude: -7.5996,
    },
    numberOfBedrooms: 3,
    numberOfBathroomsTotal: 2,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: 6,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue,
      bestRating: '10',
      ratingCount,
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Air Conditioning' },
      { '@type': 'LocationFeatureSpecification', name: 'Free Wi-Fi' },
      { '@type': 'LocationFeatureSpecification', name: 'Free Parking' },
      { '@type': 'LocationFeatureSpecification', name: 'BBQ' },
      { '@type': 'LocationFeatureSpecification', name: 'Rooftop Terrace' },
    ],
    checkinTime: '16:00',
    checkoutTime: '10:30',
    petsAllowed: false,
    tourBookingPage: 'https://villa-solria.vercel.app/pricing',
    identifier: {
      '@type': 'PropertyValue',
      name: 'AL License',
      value: '120108/AL',
    },
  };

  if (lowPrice && highPrice) {
    structuredData.priceRange = `\u20ac${lowPrice} - \u20ac${highPrice}`;
    structuredData.offers = {
      '@type': 'AggregateOffer',
      priceCurrency: 'EUR',
      lowPrice,
      highPrice,
      offerCount: String(seasonCount),
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'hero' });
  const f = await getTranslations({ locale, namespace: 'features' });
  const h = await getTranslations({ locale, namespace: 'home' });
  const r = await getTranslations({ locale, namespace: 'reviews' });
  const host = await getTranslations({ locale, namespace: 'host' });

  const features = [
    { icon: BedDouble, title: f('bedrooms'), desc: f('bedroomsDesc') },
    { icon: Waves, title: f('riaFormosa'), desc: f('riaFormosaDesc') },
    { icon: Umbrella, title: f('beach'), desc: f('beachDesc') },
    { icon: Star, title: f('rating'), desc: f('ratingDesc') },
  ];

  // Fetch reviews from Supabase
  const supabase = createServerClient();
  const { data: dbReviews } = await supabase
    .from('reviews')
    .select('*')
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(3);

  const reviews =
    dbReviews && dbReviews.length > 0
      ? (dbReviews as Review[]).map((rv) => ({
          name: rv.guest_name,
          country: rv.country,
          text: rv.comment,
          rating: String(rv.rating),
          source: rv.source,
        }))
      : [
          { name: r('review1Name'), country: r('review1Country'), text: r('review1Text'), rating: r('review1Rating') },
          { name: r('review2Name'), country: r('review2Country'), text: r('review2Text'), rating: r('review2Rating') },
          { name: r('review3Name'), country: r('review3Country'), text: r('review3Text'), rating: r('review3Rating') },
        ];

  // Fetch review stats for JSON-LD (all visible reviews, not just top 3)
  const { data: allReviewRatings, count: reviewCount } = await supabase
    .from('reviews')
    .select('rating', { count: 'exact' })
    .eq('visible', true);

  let jsonLdRatingValue = '9.4';
  let jsonLdRatingCount = '3';

  if (allReviewRatings && reviewCount && reviewCount > 0) {
    const avgRating =
      allReviewRatings.reduce((sum, rv) => sum + Number(rv.rating), 0) / reviewCount;
    jsonLdRatingValue = avgRating.toFixed(1);
    jsonLdRatingCount = String(reviewCount);
  }

  // Fetch current season price (active today) — fallback to lowest
  const { data: seasonsData } = await supabase
    .from('seasons')
    .select('price_per_night, start_date, end_date')
    .order('price_per_night', { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const activeSeason = (seasonsData || []).find(
    (s: { start_date: string; end_date: string }) => today >= s.start_date && today <= s.end_date
  );
  const lowestPrice = activeSeason?.price_per_night
    ? Math.round(Number(activeSeason.price_per_night))
    : seasonsData?.[0]?.price_per_night
      ? Math.round(Number(seasonsData[0].price_per_night))
      : null;

  // Compute price range across all seasons for JSON-LD
  const allPrices = (seasonsData || []).map((s: { price_per_night: number }) => Math.round(Number(s.price_per_night)));
  const jsonLdLowPrice = allPrices.length > 0 ? String(Math.min(...allPrices)) : null;
  const jsonLdHighPrice = allPrices.length > 0 ? String(Math.max(...allPrices)) : null;
  const seasonCount = allPrices.length;

  // Fetch savings percentage from settings
  const { data: savingsRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'direct_booking_savings_percent')
    .limit(1);

  const savingsPercent = savingsRow?.[0]?.value
    ? String(savingsRow[0].value)
    : '20';

  // Fetch WhatsApp number from settings
  const { data: whatsappRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'whatsapp_number')
    .limit(1);

  const whatsappNumber = (whatsappRow?.[0]?.value as string || '+351 960486962').replace(/[^\d]/g, '');

  // Fetch photos from Supabase
  const { data: dbPhotos } = await supabase
    .from('photos')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  const allPhotos = (dbPhotos || []) as Photo[];
  const heroPhoto = allPhotos.find((p) => p.is_hero);
  const heroSrc = heroPhoto ? getPhotoUrl(heroPhoto) : '/images/property/hero-ria-formosa.jpg';
  const heroAlt = heroPhoto?.alt_text || 'Ria Formosa panoramic view from Villa Solria';

  const previewPhotos =
    allPhotos.length > 0
      ? allPhotos
          .filter((p) => !p.is_hero)
          .slice(0, 9)
          .map((p) => ({ src: getPhotoUrl(p), alt: p.alt_text || p.filename }))
      : [
          { src: '/images/property/aerial-view.jpg', alt: 'Aerial View' },
          { src: '/images/property/living-room.jpg', alt: 'Living Room' },
          { src: '/images/property/bedroom-master.jpg', alt: 'Master Bedroom' },
          { src: '/images/property/bedroom-twin.jpg', alt: 'Twin Bedroom' },
          { src: '/images/property/kitchen.jpg', alt: 'Kitchen' },
          { src: '/images/property/bathroom.jpg', alt: 'Bathroom' },
          { src: '/images/property/terrace-view.jpg', alt: 'Terrace View' },
          { src: '/images/property/rooftop.jpg', alt: 'Rooftop' },
          { src: '/images/property/garden.jpg', alt: 'Garden' },
        ];

  return (
    <>
      <JsonLd ratingValue={jsonLdRatingValue} ratingCount={jsonLdRatingCount} lowPrice={jsonLdLowPrice} highPrice={jsonLdHighPrice} seasonCount={seasonCount} />

      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <Image
          src={heroSrc}
          alt={heroAlt}
          fill
          priority
          className="object-cover"
          sizes="100vw"
          unoptimized={heroSrc.startsWith('http')}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
            <Star size={14} className="text-sand fill-sand" />
            <span className="text-white/80 text-sm font-medium">9.4/10 Booking.com</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Villa Solria
          </h1>
          <p className="text-xl sm:text-2xl text-sand font-light mb-4">
            {t('tagline')}
          </p>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto mb-6">
            {t('subtitle')}
          </p>

          {lowestPrice && (
            <p className="text-2xl sm:text-3xl font-bold text-sand mb-8">
              {t('fromPrice', { price: String(lowestPrice) })}
            </p>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pricing"
              className="px-8 py-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all shadow-lg hover:shadow-xl text-base flex items-center gap-2"
            >
              {t('cta')}
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/villa"
              className="px-8 py-4 bg-white/10 text-white font-medium rounded-xl hover:bg-white/20 transition-all backdrop-blur-sm text-base"
            >
              {f('title').replace('?', '')}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* Direct Booking Savings Banner */}
      <section className="py-8 lg:py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 sm:p-8 text-center shadow-lg">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIi8+PC9zdmc+')] opacity-50" />
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 mb-3">
                <BadgePercent size={24} className="text-white" />
                <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                  {t('saveCompare')}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {t('saveBanner', { percent: savingsPercent })}
              </h3>
              <p className="text-white/80 text-base sm:text-lg max-w-xl mx-auto">
                {t('saveBannerDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl lg:text-3xl font-bold text-center text-gray-900 mb-12">
            {f('title')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {features.map((feat) => (
              <div key={feat.title} className="bg-white rounded-2xl p-6 text-center shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feat.icon size={28} className="text-primary" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{feat.title}</h3>
                <p className="text-sm text-gray-500">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Photo Grid */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              {h('photosTitle')}
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {previewPhotos.map((photo, i) => (
              <div
                key={photo.src + i}
                className={`relative overflow-hidden rounded-2xl ${i === 0 ? 'lg:col-span-2 lg:row-span-2 aspect-[4/3] lg:aspect-auto' : 'aspect-[4/3]'}`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-500"
                  sizes={i === 0 ? '(max-width: 1024px) 100vw, 50vw' : '(max-width: 1024px) 50vw, 25vw'}
                  unoptimized={photo.src.startsWith('http')}
                />
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 text-accent font-medium hover:underline"
            >
              {h('viewGallery')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Host */}
      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl p-8 sm:p-10 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="flex-shrink-0">
                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center">
                  <User size={40} className="text-primary" />
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {host('title')}
                </h2>
                <p className="text-lg font-semibold text-gray-800 mb-1">{host('name')}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-sm text-gray-500 mb-4">
                  <span className="inline-flex items-center gap-1">
                    <Star size={14} className="text-accent fill-accent" />
                    {host('since')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={14} />
                    {host('responseTime')}
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed mb-6">
                  {host('bio')}
                </p>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all shadow-sm text-sm"
                >
                  <MessageCircle size={18} />
                  {host('contact')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              {h('reviewsTitle')}
            </h2>
            <div className="inline-flex items-center gap-2 bg-accent/10 px-4 py-2 rounded-full">
              <Star size={16} className="text-accent fill-accent" />
              <span className="text-accent font-semibold">{r('rating')}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <ReviewCard key={review.name} {...review} />
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <EmailCapture locale={locale} />

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-primary">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-4">
            {h('ctaTitle')}
          </h2>
          <p className="text-white/70 mb-8 text-lg">
            {h('ctaSubtitle')}
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-all shadow-lg text-lg"
          >
            {h('ctaButton')}
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </>
  );
}
