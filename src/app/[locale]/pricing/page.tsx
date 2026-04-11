import { getTranslations } from 'next-intl/server';
import {
  Info,
  Users,
  BedDouble,
  Wind,
  Waves,
  Umbrella,
  Wifi,
  ChefHat,
  Car,
} from 'lucide-react';
import BookingForm from '@/components/BookingForm';
import { createServerClient } from '@/lib/supabase-server';
import type { Season } from '@/lib/supabase';

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('pricingTitle'), description: t('pricingDescription') };
}

const seasonStyles = [
  { color: 'border-gray-200', bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600' },
  { color: 'border-accent/30', bg: 'bg-accent/5', badge: 'bg-accent/10 text-accent', featured: true },
  { color: 'border-sand/40', bg: 'bg-sand/5', badge: 'bg-sand/20 text-sand' },
];

// Translate common season names based on locale
const seasonNameTranslations: Record<string, Record<string, string>> = {
  pt: {
    'Low Season': 'Época Baixa',
    'Mid Season': 'Época Média',
    'High Season': 'Época Alta',
    'Low Season Winter': 'Época Baixa (Inverno)',
    'Mid Season Autumn': 'Época Média (Outono)',
  },
  en: {
    'Low Season': 'Low Season',
    'Mid Season': 'Mid Season',
    'High Season': 'High Season',
    'Low Season Winter': 'Low Season (Winter)',
    'Mid Season Autumn': 'Mid Season (Autumn)',
  },
  es: {
    'Low Season': 'Temporada Baja',
    'Mid Season': 'Temporada Media',
    'High Season': 'Temporada Alta',
    'Low Season Winter': 'Temporada Baja (Invierno)',
    'Mid Season Autumn': 'Temporada Media (Otoño)',
  },
  de: {
    'Low Season': 'Nebensaison',
    'Mid Season': 'Zwischensaison',
    'High Season': 'Hauptsaison',
    'Low Season Winter': 'Nebensaison (Winter)',
    'Mid Season Autumn': 'Zwischensaison (Herbst)',
  },
};

function translateSeasonName(name: string, locale: string): string {
  const localeMap = seasonNameTranslations[locale] || seasonNameTranslations.en;
  return localeMap[name] || name;
}

function translateNights(count: number, locale: string): string {
  const labels: Record<string, string> = {
    pt: count === 1 ? 'noite' : 'noites',
    en: count === 1 ? 'night' : 'nights',
    es: count === 1 ? 'noche' : 'noches',
    de: count === 1 ? 'Nacht' : 'Nächte',
  };
  return labels[locale] || labels.en;
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(locale === 'pt' ? 'pt-PT' : locale === 'es' ? 'es-ES' : locale === 'de' ? 'de-DE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });
  const tf = await getTranslations({ locale, namespace: 'propertyFeatures' });

  // Fetch seasons from Supabase
  const supabase = createServerClient();
  const { data: dbSeasons } = await supabase
    .from('seasons')
    .select('*')
    .order('price_per_night', { ascending: true });

  const seasons: (Season & { style: typeof seasonStyles[number] })[] = (dbSeasons || []).map((s: Season, i: number) => ({
    ...s,
    style: seasonStyles[i % seasonStyles.length],
  }));

  const hasSeasons = seasons.length > 0;

  const features = [
    { icon: Users, title: tf('guests'), desc: tf('guestsDesc'), color: 'bg-accent/10 text-accent' },
    { icon: BedDouble, title: tf('bedrooms'), desc: tf('bedroomsDesc'), color: 'bg-sand/20 text-sand' },
    { icon: Wind, title: tf('ac'), desc: tf('acDesc'), color: 'bg-sky-100 text-sky-600' },
    { icon: Waves, title: tf('view'), desc: tf('viewDesc'), color: 'bg-blue-100 text-blue-600' },
    { icon: Umbrella, title: tf('beach'), desc: tf('beachDesc'), color: 'bg-amber-100 text-amber-600' },
    { icon: Wifi, title: tf('wifi'), desc: tf('wifiDesc'), color: 'bg-emerald-100 text-emerald-600' },
    { icon: ChefHat, title: tf('kitchen'), desc: tf('kitchenDesc'), color: 'bg-rose-100 text-rose-600' },
    { icon: Car, title: tf('parking'), desc: tf('parkingDesc'), color: 'bg-violet-100 text-violet-600' },
  ];

  return (
    <div className="py-12 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">{t('title')}</h1>
          <p className="text-lg text-gray-500">{t('subtitle')}</p>
        </div>

        {/* Property Features Section */}
        <section className="mb-16">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{tf('title')}</h2>
            <p className="text-gray-500">{tf('subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${f.color}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Booking Form (includes calendar + price breakdown) */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">{t('inquiryTitle')}</h2>
            <p className="text-gray-500 text-center mb-6">{t('inquirySubtitle')}</p>
            <BookingForm />
          </div>
        </div>

        {/* Pricing Reference Title */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('title')} {t('perNight')}</h2>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
          {hasSeasons ? (
            seasons.map((season) => (
              <div
                key={season.id}
                className={`rounded-2xl p-8 border-2 ${season.style.color} ${season.style.bg} text-center ${season.style.featured ? 'ring-2 ring-accent/20 scale-[1.02]' : ''} transition-transform`}
              >
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-4 ${season.style.badge}`}>
                  {formatDate(season.start_date, locale)} - {formatDate(season.end_date, locale)}
                </span>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{translateSeasonName(season.name, locale)}</h3>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-gray-900">{season.price_per_night}&euro;</span>
                  <span className="text-gray-500 text-sm">{t('perNight')}</span>
                </div>
                {season.min_nights > 1 && (
                  <p className="text-xs text-gray-400 mt-2">Min. {season.min_nights} {translateNights(season.min_nights, locale)}</p>
                )}
              </div>
            ))
          ) : (
            <>
              {[
                { name: t('lowSeason'), period: t('lowSeasonPeriod'), price: '90', ...seasonStyles[0] },
                { name: t('midSeason'), period: t('midSeasonPeriod'), price: '130', ...seasonStyles[1] },
                { name: t('highSeason'), period: t('highSeasonPeriod'), price: '180', ...seasonStyles[2] },
              ].map((season) => (
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
            </>
          )}
        </div>

        <div className="max-w-2xl mx-auto space-y-3">
          <p className="text-center text-gray-500 text-sm">{t('minimumStay')}</p>
          <div className="flex items-start gap-2 bg-accent/5 rounded-xl p-4">
            <Info size={18} className="text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">{t('availabilityNote')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
