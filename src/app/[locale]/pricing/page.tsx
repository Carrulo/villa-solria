import { getTranslations } from 'next-intl/server';
import {
  Calendar,
  CalendarDays,
  CalendarCheck,
  Star,
  Shield,
  Clock,
  Check,
  MapPin,
  Users,
  BedDouble,
  Info,
} from 'lucide-react';
import BookingForm from '@/components/BookingForm';
import MobileBookingBar from '@/components/MobileBookingBar';
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

// Translate common season names based on locale
const seasonNameTranslations: Record<string, Record<string, string>> = {
  pt: {
    'Low Season': 'Epoca Baixa',
    'Mid Season': 'Epoca Media',
    'High Season': 'Epoca Alta',
    'Low Season Winter': 'Epoca Baixa (Inverno)',
    'Mid Season Autumn': 'Epoca Media (Outono)',
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
    'Mid Season Autumn': 'Temporada Media (Otono)',
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

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(
    locale === 'pt' ? 'pt-PT' : locale === 'es' ? 'es-ES' : locale === 'de' ? 'de-DE' : 'en-GB',
    { day: 'numeric', month: 'short' },
  );
}

// Classify seasons into 3 visual tiers based on unique price points
type SeasonTier = 'low' | 'mid' | 'high';

function isSeasonActive(s: { start_date: string; end_date: string }): boolean {
  const today = new Date().toISOString().substring(0, 10);
  return s.start_date <= today && today <= s.end_date;
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pricing' });

  // Fetch seasons from Supabase
  const supabase = createServerClient();
  const { data: dbSeasons } = await supabase
    .from('seasons')
    .select('*')
    .order('price_per_night', { ascending: true });

  const rawSeasons: Season[] = dbSeasons || [];
  const hasSeasons = rawSeasons.length > 0;

  // Current season price (active season) -- fallback to lowest
  const today = new Date().toISOString().slice(0, 10);
  const activeSeason = rawSeasons.find(
    (s) => today >= s.start_date && today <= s.end_date
  );
  const currentPrice = activeSeason?.price_per_night
    ?? (hasSeasons ? Math.min(...rawSeasons.map((s) => s.price_per_night)) : 90);
  const startingPrice = currentPrice;

  // Build display set: group seasons by unique price (not index), show up to 3 tiers
  type DisplaySeason = {
    id: string;
    name: string;
    period: string;
    price: number;
    minNights: number;
    tier: SeasonTier;
    isActive: boolean;
  };

  // Fixed season labels for display (translated keys)
  const tierLabels: Record<SeasonTier, string> = {
    low: t('lowSeason'),
    mid: t('midSeason'),
    high: t('highSeason'),
  };

  let displaySeasons: DisplaySeason[] = [];
  if (hasSeasons) {
    // Group all seasons by their price (unique prices = unique tiers)
    const priceGroups = new Map<number, Season[]>();
    rawSeasons.forEach((s) => {
      const existing = priceGroups.get(s.price_per_night) || [];
      existing.push(s);
      priceGroups.set(s.price_per_night, existing);
    });

    // Sort prices ascending: cheapest = low, middle = mid, highest = high
    const sortedPrices = Array.from(priceGroups.keys()).sort((a, b) => a - b);
    const priceCount = sortedPrices.length;

    sortedPrices.forEach((price, i) => {
      let tier: SeasonTier;
      if (priceCount === 1) tier = 'mid';
      else if (priceCount === 2) tier = i === 0 ? 'low' : 'high';
      else if (i === 0) tier = 'low';
      else if (i === priceCount - 1) tier = 'high';
      else tier = 'mid';

      const seasonsAtPrice = priceGroups.get(price) || [];
      // Join all date ranges for this price tier (e.g. "Jan-May, Nov-Dec")
      const period = seasonsAtPrice
        .map((s) => `${formatDate(s.start_date, locale)} - ${formatDate(s.end_date, locale)}`)
        .join(' / ');
      // Active if today falls in ANY of the ranges for this price
      const isActive = seasonsAtPrice.some(isSeasonActive);
      // Min nights = minimum across all seasons at this price
      const minNights = Math.min(...seasonsAtPrice.map((s) => s.min_nights || 1));

      displaySeasons.push({
        id: `tier-${tier}`,
        name: tierLabels[tier],
        period,
        price,
        minNights,
        tier,
        isActive,
      });
    });

    // Take max 3 tiers (low, mid, high)
    displaySeasons = displaySeasons.slice(0, 3);
  } else {
    displaySeasons = [
      {
        id: 'fallback-low',
        name: t('lowSeason'),
        period: t('lowSeasonPeriod'),
        price: 90,
        minNights: 1,
        tier: 'low',
        isActive: false,
      },
      {
        id: 'fallback-mid',
        name: t('midSeason'),
        period: t('midSeasonPeriod'),
        price: 130,
        minNights: 3,
        tier: 'mid',
        isActive: false,
      },
      {
        id: 'fallback-high',
        name: t('highSeason'),
        period: t('highSeasonPeriod'),
        price: 210,
        minNights: 7,
        tier: 'high',
        isActive: false,
      },
    ];
  }

  const tierColors: Record<SeasonTier, { dot: string; text: string; bg: string }> = {
    low: { dot: 'bg-emerald-400', text: 'text-emerald-700', bg: 'bg-emerald-50' },
    mid: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50' },
    high: { dot: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-50' },
  };

  const longStayDiscounts = [
    { nights: '7+', percent: 10, label: t('discount7Title'), desc: t('discount7Desc'), cleaning: false },
    { nights: '14+', percent: 15, label: t('discount14Title'), desc: t('discount14Desc'), cleaning: true },
    { nights: '28+', percent: 25, label: t('discount28Title'), desc: t('discount28Desc'), cleaning: true },
  ];

  return (
    <div className="pb-24 lg:pb-12">
      {/* ---- SECTION 1: COMPACT HERO ---- */}
      <section className="border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent mb-2">
            {t('brand')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-1">
            {t('startingAt')}{' '}
            <span className="text-accent">{startingPrice}&euro;</span>
            <span className="text-gray-400 text-xl sm:text-2xl font-medium">
              {t('perNight')}
            </span>
          </h1>
          <div className="flex items-center justify-center gap-3 mt-3 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1">
              <Star size={14} className="fill-amber-400 text-amber-400" />
              {t('ratingBadge')}
            </span>
            <span className="text-gray-300">|</span>
            <span className="inline-flex items-center gap-1">
              <MapPin size={14} />
              {t('pillLocation')}
            </span>
            <span className="text-gray-300">|</span>
            <span className="inline-flex items-center gap-1">
              <Users size={14} />
              {t('pillGuests')}
            </span>
          </div>
          {/* Mobile only: scroll to booking form */}
          <a
            href="#booking-form-section"
            className="lg:hidden inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold rounded-full px-8 py-3.5 text-sm shadow-lg shadow-accent/25 transition-all hover:scale-[1.02] mt-5"
          >
            <Calendar size={16} />
            {t('checkAvailability')}
          </a>
        </div>
      </section>

      {/* ---- SECTION 2: BOOKING FORM (full width, the star) ---- */}
      <section id="booking-form-section" className="scroll-mt-20 bg-gray-50/50 border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
              {t('availabilityTitle')}
            </h2>
            <p className="text-gray-500 text-sm">{t('availabilitySubtitle')}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-8 lg:p-10">
            <BookingForm />
          </div>
          <div className="mt-4 flex items-start gap-2 bg-accent/5 rounded-xl p-4 max-w-2xl mx-auto">
            <Info size={16} className="text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">{t('availabilityNote')}</p>
          </div>
        </div>
      </section>

      {/* ---- SECTION 3: SEASON PRICING (compact horizontal cards) ---- */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
              {t('pricingTableTitle')}
            </h2>
            <p className="text-gray-500 text-sm">{t('pricingTableSubtitle')}</p>
          </div>

          {/* Season cards - horizontal on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {displaySeasons.map((season) => {
              const colors = tierColors[season.tier];
              const isActive = season.isActive;
              const minLabel =
                season.minNights === 1
                  ? t('minNightsShort', { count: season.minNights })
                  : t('minNightsShortPlural', { count: season.minNights });
              const checkInLabel =
                season.tier === 'high' ? t('checkInSaturday') : t('checkInFlexible');

              return (
                <div
                  key={season.id}
                  className={`relative rounded-xl border p-5 transition-all ${
                    isActive
                      ? 'border-accent bg-accent/[0.02] ring-1 ring-accent/20 shadow-md'
                      : 'border-gray-150 bg-white hover:shadow-sm'
                  }`}
                >
                  {isActive && (
                    <span className="absolute -top-2.5 left-4 bg-accent text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      {t('currentSeasonBadge')}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <h3 className="font-semibold text-gray-900 text-sm">{season.name}</h3>
                  </div>
                  <div className="mb-3">
                    <span className="text-3xl font-bold text-gray-900">{season.price}&euro;</span>
                    <span className="text-gray-400 text-sm ml-1">{t('perNight')}</span>
                  </div>
                  <p className={`text-xs ${colors.text} ${colors.bg} rounded-md px-2 py-1 inline-block mb-3`}>
                    {season.period}
                  </p>
                  <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-gray-400" />
                      <span>{minLabel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-gray-400" />
                      <span>{checkInLabel}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Long-stay discounts - compact inline */}
          <div className="mt-8 bg-gray-50 rounded-xl p-5">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">{t('discountsTitle')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {longStayDiscounts.map((d) => (
                <div key={d.nights} className="flex items-center gap-3">
                  <span className="text-xl font-bold text-accent">-{d.percent}%</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{d.label}</p>
                    <p className="text-xs text-gray-500">{d.desc}</p>
                    {d.cleaning && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mt-0.5">
                        <Check size={10} /> {t('cleaningIncluded')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">{t('longStayHint')}</p>
          </div>
        </div>
      </section>

      {/* ---- SECTION 4: TRUST SIGNALS (compact footer strip) ---- */}
      <section className="bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500">
            <span className="inline-flex items-center gap-1.5">
              <Shield size={15} className="text-emerald-500" />
              {t('trustSecure')}
            </span>
            <span className="hidden sm:inline text-gray-200">|</span>
            <span className="inline-flex items-center gap-1.5">
              <Check size={15} className="text-sky-500" />
              {t('trustInstant')}
            </span>
            <span className="hidden sm:inline text-gray-200">|</span>
            <span className="inline-flex items-center gap-1.5">
              <Star size={15} className="text-amber-400 fill-amber-400" />
              {t('trustRating')}
            </span>
            <span className="hidden sm:inline text-gray-200">|</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={15} className="text-violet-500" />
              {t('trustSupport')}
            </span>
          </div>
        </div>
      </section>

      {/* ---- STICKY MOBILE BOOK BAR ---- */}
      <MobileBookingBar startingPrice={startingPrice} />
    </div>
  );
}
