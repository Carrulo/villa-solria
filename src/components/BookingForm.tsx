'use client';

import { useTranslations, useLocale } from 'next-intl';
import { COUNTRIES } from '@/lib/countries';
import { useEffect, useMemo, useState } from 'react';
import { Send, AlertCircle, ShieldCheck } from 'lucide-react';
import AvailabilityCalendar, { type DateRange } from './AvailabilityCalendar';
import { trackGA4Event, trackMetaEvent } from './Analytics';

type Season = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
  min_nights: number;
  cleaning_fee: number;
  weekly_discount: number;
  biweekly_discount: number;
  monthly_discount: number;
  mid_stay_cleaning_fee: number;
  mid_stay_cleaning_auto_threshold: number;
};

function diffNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function findSeasonForDate(seasons: Season[], date: string): Season | null {
  // Use the season whose range contains the date
  for (const s of seasons) {
    if (date >= s.start_date && date <= s.end_date) return s;
  }
  // Fallback: closest season
  return seasons[0] || null;
}

function formatDateDisplay(iso: string, locale: string): string {
  const map: Record<string, string> = {
    pt: 'pt-PT',
    en: 'en-GB',
    es: 'es-ES',
    de: 'de-DE',
  };
  return new Date(iso).toLocaleDateString(map[locale] || 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function BookingForm() {
  const t = useTranslations('form');
  const tp = useTranslations('priceBreakdown');
  const tc = useTranslations('calendar');
  const td = useTranslations('discounts');
  const locale = useLocale();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState<DateRange>({ checkIn: null, checkOut: null });
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(true);
  const [midStayOptIn, setMidStayOptIn] = useState<boolean | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    fetch('/api/seasons')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSeasons(data);
      })
      .catch(() => {})
      .finally(() => setSeasonsLoading(false));
  }, []);

  const nights = useMemo(() => {
    if (!range.checkIn || !range.checkOut) return 0;
    return diffNights(range.checkIn, range.checkOut);
  }, [range]);

  const activeSeason = useMemo(() => {
    if (!range.checkIn) return null;
    return findSeasonForDate(seasons, range.checkIn);
  }, [range.checkIn, seasons]);

  const pricePerNight = activeSeason?.price_per_night ?? 0;
  const cleaningFee = activeSeason?.cleaning_fee ?? 0;
  const minNights = activeSeason?.min_nights ?? 3;
  const weeklyDiscount = activeSeason?.weekly_discount ?? 0;
  const biweeklyDiscount = activeSeason?.biweekly_discount ?? 0;
  const monthlyDiscount = activeSeason?.monthly_discount ?? 0;
  const midStayFee = activeSeason?.mid_stay_cleaning_fee ?? 0;
  const midStayThreshold = activeSeason?.mid_stay_cleaning_auto_threshold ?? 14;

  const subTotal = pricePerNight * nights;

  // Long-stay discount tier
  const discountPercent = useMemo(() => {
    if (nights >= 28) return monthlyDiscount;
    if (nights >= 14) return biweeklyDiscount;
    if (nights >= 7) return weeklyDiscount;
    return 0;
  }, [nights, weeklyDiscount, biweeklyDiscount, monthlyDiscount]);

  const discountAmount = Math.round(subTotal * (discountPercent / 100));

  // Next-tier nudge: if the guest is within 4 nights of unlocking a bigger discount,
  // suggest extending the stay. Shows only the nearest reachable upgrade.
  const nudge = useMemo(() => {
    if (nights <= 0 || pricePerNight <= 0) return null;
    const candidates: { tierNights: number; tierPct: number }[] = [];
    if (nights < 7 && weeklyDiscount > 0) candidates.push({ tierNights: 7, tierPct: weeklyDiscount });
    if (nights < 14 && biweeklyDiscount > discountPercent)
      candidates.push({ tierNights: 14, tierPct: biweeklyDiscount });
    if (nights < 28 && monthlyDiscount > discountPercent)
      candidates.push({ tierNights: 28, tierPct: monthlyDiscount });
    const next = candidates.find((c) => c.tierNights - nights <= 4 && c.tierNights - nights > 0);
    if (!next) return null;
    const extra = next.tierNights - nights;
    const newDiscount = Math.round(pricePerNight * next.tierNights * (next.tierPct / 100));
    const delta = newDiscount - discountAmount;
    if (delta <= 0) return null;
    return { extra, percent: next.tierPct, savings: delta };
  }, [nights, pricePerNight, weeklyDiscount, biweeklyDiscount, monthlyDiscount, discountPercent, discountAmount]);

  // Mid-stay cleaning logic
  const midStayCount = Math.floor(nights / 7);
  const midStayEligible = nights >= midStayThreshold && midStayCount > 0 && midStayFee > 0;
  const midStayEnabled = midStayEligible && (midStayOptIn ?? true);
  const midStayTotal = midStayEnabled ? midStayCount * midStayFee : 0;

  const total = subTotal - discountAmount + cleaningFee + midStayTotal;

  const minNightsViolated = nights > 0 && nights < minNights;
  const datesComplete = Boolean(range.checkIn && range.checkOut);
  const canSubmit = datesComplete && !minNightsViolated && termsAccepted && !loading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canSubmit || !range.checkIn || !range.checkOut) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const cribRequested = formData.get('crib') === 'on';
    const userMessage = (formData.get('message') as string) || '';
    const finalMessage = cribRequested
      ? userMessage
        ? `${userMessage}\n\n[${t('cribRequested')}]`
        : `[${t('cribRequested')}]`
      : userMessage;

    const data = {
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      country: (formData.get('country') as string) || null,
      locale,
      checkIn: range.checkIn,
      checkOut: range.checkOut,
      guests: formData.get('guests') as string,
      message: finalMessage,
      needsCrib: cribRequested,
      nights,
      price_per_night: pricePerNight,
      cleaning_fee: cleaningFee,
      discount_percent: discountPercent,
      discount_amount: discountAmount,
      mid_stay_cleaning_count: midStayEnabled ? midStayCount : 0,
      mid_stay_cleaning_total: midStayTotal,
      total_price: total,
    };

    try {
      // 1. Create booking (pending)
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      const bookingId = result.booking?.id;
      if (!bookingId) {
        setError('Booking created but missing ID');
        setLoading(false);
        return;
      }

      // 2. Create Stripe Checkout Session and redirect
      const checkoutRes = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, locale }),
      });

      const checkoutResult = await checkoutRes.json();

      if (!checkoutRes.ok || !checkoutResult.url) {
        setError(checkoutResult.error || 'Failed to start payment');
        setLoading(false);
        return;
      }

      // Track begin_checkout conversion event
      trackGA4Event('begin_checkout', {
        currency: 'EUR',
        value: total,
        items: [
          {
            item_name: 'Villa Solria Booking',
            quantity: nights,
            price: pricePerNight,
          },
        ],
      });
      trackMetaEvent('InitiateCheckout', {
        currency: 'EUR',
        value: total,
        num_items: 1,
      });

      // Redirect to Stripe Checkout
      window.location.href = checkoutResult.url;
    } catch {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Send size={24} className="text-green-600" />
        </div>
        <p className="text-green-800 font-medium text-lg">{t('success')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Availability calendar */}
      <AvailabilityCalendar value={range} onChange={setRange} minNights={minNights} />

      {/* Price breakdown */}
      {datesComplete && nights > 0 && seasonsLoading && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-2/5" />
              <div className="h-4 bg-gray-200 rounded w-16" />
            </div>
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/4" />
              <div className="h-4 bg-gray-200 rounded w-12" />
            </div>
            <div className="border-t border-gray-200 my-2" />
            <div className="flex justify-between">
              <div className="h-5 bg-gray-200 rounded w-1/5" />
              <div className="h-5 bg-gray-200 rounded w-20" />
            </div>
          </div>
        </div>
      )}
      {datesComplete && nights > 0 && !seasonsLoading && (
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{tp('title')}</h3>

          {minNightsViolated && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 mb-4">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <p className="text-amber-800 text-sm">
                {tc('minNightsWarning', { count: minNights })}
              </p>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>
                {nights} × {pricePerNight}&euro; {tp('perNight')}
              </span>
              <span>{subTotal.toFixed(0)}&euro;</span>
            </div>
            {discountPercent > 0 && (
              <div className="flex justify-between text-green-600">
                <span>{tp('discount', { percent: discountPercent })}</span>
                <span>-{discountAmount.toFixed(0)}&euro;</span>
              </div>
            )}
            {nudge && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 my-1">
                <p className="text-amber-800 text-xs">
                  {td('addNightsNudge', {
                    count: nudge.extra,
                    percent: nudge.percent,
                    amount: nudge.savings,
                  })}
                </p>
              </div>
            )}
            <div className="flex justify-between text-gray-600">
              <span>{tp('cleaningFee')}</span>
              <span>+{cleaningFee.toFixed(0)}&euro;</span>
            </div>
            {midStayEligible && (
              <div className="flex justify-between items-center text-gray-600">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={midStayEnabled}
                    onChange={(e) => setMidStayOptIn(e.target.checked)}
                    className="w-4 h-4 accent-accent rounded cursor-pointer"
                  />
                  <span>
                    {tp('midStayCleaning')} ({midStayCount}×)
                  </span>
                </label>
                <span>{midStayEnabled ? `+${midStayTotal.toFixed(0)}` : '0'}&euro;</span>
              </div>
            )}
            <div className="border-t border-gray-200 my-2" />
            <div className="flex justify-between font-semibold text-gray-900 text-base">
              <span>{tp('total')}</span>
              <span>{total.toFixed(0)}&euro;</span>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-400 text-center">
            {formatDateDisplay(range.checkIn!, locale)} → {formatDateDisplay(range.checkOut!, locale)}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('name')} *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              placeholder={t('namePlaceholder')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all bg-white"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('email')} *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder={t('emailPlaceholder')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all bg-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">
            {locale === 'pt' ? 'País' : locale === 'es' ? 'País' : locale === 'de' ? 'Land' : 'Country'}
          </label>
          <select
            id="country"
            name="country"
            defaultValue=""
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all bg-white"
          >
            <option value="">—</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name_pt}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('phone')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              placeholder={t('phonePlaceholder')}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all bg-white"
            />
          </div>
          <div>
            <label htmlFor="guests" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('guests')} *
            </label>
            <select
              id="guests"
              name="guests"
              required
              defaultValue="2"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all bg-white"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Crib option */}
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="crib"
              className="mt-0.5 w-4 h-4 accent-accent rounded cursor-pointer"
            />
            <div>
              <span className="text-sm font-medium text-gray-900 block">
                👶 {t('cribLabel')}
              </span>
              <span className="text-xs text-gray-500">{t('cribDesc')}</span>
            </div>
          </label>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
            {t('message')}
          </label>
          <textarea
            id="message"
            name="message"
            rows={4}
            placeholder={t('messagePlaceholder')}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all bg-white resize-none"
          />
        </div>

        {/* Cancellation policy summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium">{t('cancellationTitle')}</p>
            <p className="text-blue-700 text-xs mt-0.5">{t('cancellationDesc')}</p>
          </div>
        </div>

        {/* Payment deadline notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-amber-600 shrink-0 mt-0.5 text-lg">⏰</span>
          <div className="text-sm text-amber-900">
            <p className="font-medium">{t('paymentDeadlineTitle')}</p>
            <p className="text-amber-700 text-xs mt-0.5">{t('paymentDeadlineDesc')}</p>
          </div>
        </div>

        {/* Terms acceptance */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              required
              className="mt-0.5 w-4 h-4 accent-accent rounded cursor-pointer shrink-0"
            />
            <span className="text-xs text-gray-700 leading-relaxed">
              {t.rich('acceptTerms', {
                terms: (chunks) => (
                  <a
                    href={`/${locale}/legal/terms`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline hover:no-underline font-medium"
                  >
                    {chunks}
                  </a>
                ),
                privacy: (chunks) => (
                  <a
                    href={`/${locale}/legal/privacy`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline hover:no-underline font-medium"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            t('sending')
          ) : (
            <>
              <Send size={18} />
              {datesComplete ? tp('proceedBooking') : t('submit')}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
