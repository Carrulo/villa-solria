import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Info } from 'lucide-react';
import BookingForm from '@/components/BookingForm';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('pricingTitle'), description: t('pricingDescription') };
}

export default function PricingPage() {
  const t = useTranslations('pricing');

  const seasons = [
    {
      name: t('lowSeason'),
      period: t('lowSeasonPeriod'),
      price: '90',
      color: 'border-gray-200',
      bg: 'bg-gray-50',
      badge: 'bg-gray-100 text-gray-600',
    },
    {
      name: t('midSeason'),
      period: t('midSeasonPeriod'),
      price: '130',
      color: 'border-accent/30',
      bg: 'bg-accent/5',
      badge: 'bg-accent/10 text-accent',
      featured: true,
    },
    {
      name: t('highSeason'),
      period: t('highSeasonPeriod'),
      price: '180',
      color: 'border-sand/40',
      bg: 'bg-sand/5',
      badge: 'bg-sand/20 text-sand',
    },
  ];

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
          {seasons.map((season) => (
            <div
              key={season.name}
              className={`rounded-2xl p-8 border-2 ${season.color} ${season.bg} text-center ${season.featured ? 'ring-2 ring-accent/20 scale-[1.02]' : ''} transition-transform`}
            >
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${season.badge}`}>
                {season.period}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{season.name}</h3>
              <div className="mb-2">
                <span className="text-4xl font-bold text-gray-900">{season.price}&euro;</span>
                <span className="text-gray-500 text-sm">{t('perNight')}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-2xl mx-auto space-y-3 mb-16">
          <p className="text-center text-gray-500 text-sm">{t('minimumStay')}</p>
          <p className="text-center text-gray-500 text-sm">{t('cleaningFee')}</p>
          <div className="flex items-start gap-2 bg-accent/5 rounded-xl p-4">
            <Info size={18} className="text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">{t('availabilityNote')}</p>
          </div>
        </div>

        {/* Booking Form */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{t('inquiryTitle')}</h2>
            <p className="text-gray-500 text-center mb-8">{t('inquirySubtitle')}</p>
            <BookingForm />
          </div>
        </div>
      </div>
    </div>
  );
}
