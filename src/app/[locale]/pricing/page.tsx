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
  Calendar,
  CalendarDays,
  CalendarCheck,
  Star,
  Shield,
  Clock,
  Phone,
  Check,
  MapPin,
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
  const tf = await getTranslations({ locale, namespace: 'propertyFeatures' });

  // Fetch seasons from Supabase
  const supabase = createServerClient();
  const { data: dbSeasons } = await supabase
    .from('seasons')
    .select('*')
    .order('price_per_night', { ascending: true });

  const rawSeasons: Season[] = dbSeasons || [];
  const hasSeasons = rawSeasons.length > 0;

  // Starting-from price (minimum)
  const startingPrice = hasSeasons
    ? Math.min(...rawSeasons.map((s) => s.price_per_night))
    : 90;

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
        .map((s) => `${formatDate(s.start_date, locale)} – ${formatDate(s.end_date, locale)}`)
        .join(' · ');
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

  const tierStyles: Record<
    SeasonTier,
    { border: string; bg: string; badge: string }
  > = {
    low: {
      border: 'border-gray-200',
      bg: 'bg-white',
      badge: 'bg-gray-100 text-gray-600',
    },
    mid: {
      border: 'border-gray-200',
      bg: 'bg-white',
      badge: 'bg-sand/20 text-sand',
    },
    high: {
      border: 'border-gray-200',
      bg: 'bg-white',
      badge: 'bg-red-50 text-red-700',
    },
  };

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

  const longStayDiscounts = [
    {
      icon: Calendar,
      title: t('discount7Title'),
      percent: 10,
      desc: t('discount7Desc'),
      cleaning: false,
      color: 'bg-emerald-50 border-emerald-100 text-emerald-700',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
      icon: CalendarDays,
      title: t('discount14Title'),
      percent: 15,
      desc: t('discount14Desc'),
      cleaning: true,
      color: 'bg-sky-50 border-sky-100 text-sky-700',
      iconBg: 'bg-sky-100 text-sky-600',
    },
    {
      icon: CalendarCheck,
      title: t('discount28Title'),
      percent: 25,
      desc: t('discount28Desc'),
      cleaning: true,
      color: 'bg-accent/10 border-accent/30 text-accent',
      iconBg: 'bg-accent/20 text-accent',
    },
  ];

  return (
    <div className="pb-24 lg:pb-12">
      {/* ─── HERO BANNER ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent/5 via-white to-sand/10 border-b border-gray-100">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #000 1px, transparent 1px), radial-gradient(circle at 80% 70%, #000 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-accent mb-3">
              {t('brand')}
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              {t('startingAt')}{' '}
              <span className="text-accent">{startingPrice}€</span>
              <span className="text-gray-500 text-2xl sm:text-3xl lg:text-4xl font-semibold">
                {t('perNight')}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-gray-600 mb-6">{t('noFees')}</p>

            {/* Rating + pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-8">
              <span className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm font-semibold text-gray-900 shadow-sm">
                <Star size={15} className="fill-amber-400 text-amber-400" />
                {t('ratingBadge')}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/70 border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700">
                <Users size={14} /> {t('pillGuests')}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/70 border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700">
                <BedDouble size={14} /> {t('pillBedrooms')}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/70 border border-gray-200 rounded-full px-3 py-1.5 text-sm text-gray-700">
                <MapPin size={14} /> {t('pillLocation')}
              </span>
            </div>

            <a
              href="#booking-form-section"
              className="inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold rounded-full px-8 py-4 text-base shadow-lg shadow-accent/25 transition-all hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-accent/30"
            >
              <Calendar size={18} />
              {t('checkAvailability')}
            </a>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* ─── LEFT COLUMN (scrollable content) ──────────────── */}
          <div className="lg:col-span-3">
            {/* ─── PROPERTY FEATURES ───────────────────────────── */}
            <section className="mb-16">
              <div className="text-center mb-8">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">{tf('title')}</h2>
                <p className="text-gray-500 text-base lg:text-lg">{tf('subtitle')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
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

            {/* ─── PRICING TABLE (3 tiers) ─────────────────────── */}
            <section className="mb-16">
              <div className="text-center mb-10">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {t('pricingTableTitle')}
                </h2>
                <p className="text-gray-500 text-base lg:text-lg">{t('pricingTableSubtitle')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5 lg:gap-4 items-stretch">
                {displaySeasons.map((season) => {
                  const style = tierStyles[season.tier];
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
                      className={`relative rounded-2xl p-6 border-2 ${
                        isActive ? 'border-accent ring-2 ring-accent/20' : style.border
                      } ${style.bg} flex flex-col ${
                        isActive
                          ? 'shadow-xl shadow-accent/10'
                          : 'shadow-sm hover:shadow-md'
                      } transition-all`}
                    >
                      {isActive && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-md whitespace-nowrap">
                          {t('currentSeasonBadge')}
                        </span>
                      )}
                      <span
                        className={`inline-block self-center px-3 py-1 rounded-full text-xs font-medium mb-4 ${style.badge}`}
                      >
                        {season.period}
                      </span>
                      <h3 className="text-xl font-semibold text-gray-900 mb-4 text-center">
                        {season.name}
                      </h3>
                      <div className="text-center mb-5">
                        <span className="text-5xl font-bold text-gray-900 leading-none">
                          {season.price}&euro;
                        </span>
                        <span className="text-gray-500 text-sm block mt-1">{t('perNight')}</span>
                      </div>
                      <div className="space-y-2.5 text-sm text-gray-700 border-t border-gray-100 pt-4 mt-auto">
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-gray-400 shrink-0" />
                          <span>{minLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={15} className="text-gray-400 shrink-0" />
                          <span>{checkInLabel}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={15} className="text-emerald-500 shrink-0" />
                          <span className="text-gray-600">{t('longStayHint')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ─── LONG-STAY DISCOUNTS ─────────────────────────── */}
            <section className="mb-16">
              <div className="text-center mb-10">
                <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                  {t('discountsTitle')}
                </h2>
                <p className="text-gray-500 text-base lg:text-lg">{t('discountsSubtitle')}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5">
                {longStayDiscounts.map((d) => {
                  const Icon = d.icon;
                  return (
                    <div
                      key={d.title}
                      className={`rounded-2xl p-6 border ${d.color} shadow-sm hover:shadow-md transition-shadow`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${d.iconBg}`}
                      >
                        <Icon size={22} />
                      </div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <h3 className="text-xl font-bold text-gray-900">{d.title}</h3>
                        <span className="text-2xl font-bold">-{d.percent}%</span>
                      </div>
                      <p className="text-sm text-gray-600">{d.desc}</p>
                      {d.cleaning && (
                        <p className="mt-3 pt-3 border-t border-current/10 text-xs font-medium flex items-center gap-1.5">
                          <Check size={13} /> {t('cleaningIncluded')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ─── BOOKING FORM (mobile only — stacked below content) */}
            <section id="booking-form-section" className="mb-16 scroll-mt-24 lg:hidden">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {t('availabilityTitle')}
                </h2>
                <p className="text-gray-500 text-base">{t('availabilitySubtitle')}</p>
              </div>
              <BookingForm />
              <div className="mt-4 flex items-start gap-2 bg-accent/5 rounded-xl p-4">
                <Info size={18} className="text-accent shrink-0 mt-0.5" />
                <p className="text-sm text-gray-600">{t('availabilityNote')}</p>
              </div>
            </section>

            {/* ─── TRUST SIGNALS ───────────────────────────────── */}
            <section>
              <div className="text-center mb-6">
                <h2 className="text-xl lg:text-2xl font-semibold text-gray-900">{t('trustTitle')}</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Star, label: t('trustRating'), color: 'text-amber-500', bg: 'bg-amber-50' },
                  { icon: Shield, label: t('trustSecure'), color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { icon: Check, label: t('trustInstant'), color: 'text-sky-600', bg: 'bg-sky-50' },
                  { icon: Phone, label: t('trustSupport'), color: 'text-violet-600', bg: 'bg-violet-50' },
                ].map(({ icon: Icon, label, color, bg }) => (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-xl p-4 border border-gray-100 ${bg}`}
                  >
                    <Icon size={20} className={color} />
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ─── RIGHT COLUMN (sticky booking sidebar — desktop only) */}
          <div className="hidden lg:block lg:col-span-2">
            <div
              id="booking-form-section"
              className="sticky top-24 scroll-mt-24 overflow-y-auto"
              style={{ maxHeight: 'calc(100vh - 6rem)' }}
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-lg p-4 xl:p-6" data-sidebar-calendar="true">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {t('availabilityTitle')}
                </h3>
                <p className="text-gray-500 text-xs mb-4">{t('availabilitySubtitle')}</p>
                <BookingForm />
                <div className="mt-4 flex items-start gap-2 bg-accent/5 rounded-xl p-4">
                  <Info size={18} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">{t('availabilityNote')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── STICKY MOBILE BOOK BAR ────────────────────────────── */}
      <MobileBookingBar startingPrice={startingPrice} />
    </div>
  );
}
