import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { BedDouble, Users, Waves, Umbrella, Star, ArrowRight } from 'lucide-react';
import ReviewCard from '@/components/ReviewCard';
import PhotoPlaceholder from '@/components/PhotoPlaceholder';

function JsonLd() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'VacationRental',
    name: 'Villa Solria',
    description: 'Duplex villa with 3 bedrooms and Ria Formosa views in Cabanas de Tavira, Algarve',
    url: 'https://villasolria.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Rua do Junco 3.5B',
      addressLocality: 'Tavira',
      postalCode: '8800-591',
      addressCountry: 'PT',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 37.1278,
      longitude: -7.5947,
    },
    numberOfBedrooms: 3,
    numberOfBathroomsTotal: 2,
    occupancy: {
      '@type': 'QuantitativeValue',
      maxValue: 6,
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '9.4',
      bestRating: '10',
      ratingCount: '3',
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
    tourBookingPage: 'https://villasolria.com/pricing',
    identifier: {
      '@type': 'PropertyValue',
      name: 'AL License',
      value: '120108/AL',
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  );
}

export default function HomePage() {
  const t = useTranslations('hero');
  const f = useTranslations('features');
  const h = useTranslations('home');
  const r = useTranslations('reviews');

  const features = [
    { icon: BedDouble, title: f('bedrooms'), desc: f('bedroomsDesc') },
    { icon: Waves, title: f('riaFormosa'), desc: f('riaFormosaDesc') },
    { icon: Umbrella, title: f('beach'), desc: f('beachDesc') },
    { icon: Star, title: f('rating'), desc: f('ratingDesc') },
  ];

  const reviews = [
    { name: r('review1Name'), country: r('review1Country'), text: r('review1Text'), rating: r('review1Rating') },
    { name: r('review2Name'), country: r('review2Country'), text: r('review2Text'), rating: r('review2Rating') },
    { name: r('review3Name'), country: r('review3Country'), text: r('review3Text'), rating: r('review3Rating') },
  ];

  const photoLabels = [
    'Living Room', 'Ria Formosa View', 'Master Bedroom',
    'Rooftop Terrace', 'Kitchen', 'Garden & BBQ',
  ];

  return (
    <>
      <JsonLd />

      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary-light overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-50" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-6">
            <Star size={14} className="text-sand fill-sand" />
            <span className="text-white/80 text-sm font-medium">9.4/10 Booking.com</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Villa Solria
          </h1>
          <p className="text-xl sm:text-2xl text-sand font-light mb-4">
            {t('tagline')}
          </p>
          <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto mb-10">
            {t('subtitle')}
          </p>

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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {photoLabels.map((label, i) => (
              <PhotoPlaceholder
                key={label}
                label={label}
                className={`${i === 0 ? 'lg:col-span-2 lg:row-span-2 aspect-[4/3] lg:aspect-auto lg:min-h-[400px]' : 'aspect-[4/3]'}`}
              />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/gallery"
              className="inline-flex items-center gap-2 text-accent font-medium hover:underline"
            >
              View full gallery <ArrowRight size={16} />
            </Link>
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
