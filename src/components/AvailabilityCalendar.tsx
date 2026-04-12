'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getHolidays, localeToCountry } from '@/lib/holidays';

export type DateRange = {
  checkIn: string | null;
  checkOut: string | null;
};

type Props = {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
  minNights?: number;
};

type BlockedDate = { date: string; source: string; note: string | null };

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function monthLabel(date: Date, locale: string): string {
  const map: Record<string, string> = {
    pt: 'pt-PT',
    en: 'en-GB',
    es: 'es-ES',
    de: 'de-DE',
  };
  return date.toLocaleDateString(map[locale] || 'en-GB', {
    month: 'long',
    year: 'numeric',
  });
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
  });
}

function diffNights(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn);
  const b = new Date(checkOut);
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function rangeContainsBlocked(
  checkIn: string,
  checkOut: string,
  blockedSet: Set<string>
): boolean {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  while (cur < end) {
    if (blockedSet.has(toISO(cur))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

export default function AvailabilityCalendar({ value, onChange, minNights = 3 }: Props) {
  const t = useTranslations('calendar');
  const locale = useLocale();

  const today = startOfDay(new Date());
  const todayISO = toISO(today);
  const [viewMonth, setViewMonth] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const checkIn = value?.checkIn ?? null;
  const checkOut = value?.checkOut ?? null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch('/api/blocked-dates')
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        if (Array.isArray(data)) setBlocked(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const blockedSet = useMemo(() => new Set(blocked.map((b) => b.date)), [blocked]);

  const holidayMap = useMemo(() => {
    const country = localeToCountry(locale);
    const year1 = viewMonth.getFullYear();
    const nextM = addMonths(viewMonth, 1);
    const year2 = nextM.getFullYear();
    const map = new Map<string, string>();
    for (const [k, v] of getHolidays(year1, country)) map.set(k, v);
    if (year2 !== year1) {
      for (const [k, v] of getHolidays(year2, country)) map.set(k, v);
    }
    return map;
  }, [locale, viewMonth]);

  const handleDayClick = (iso: string) => {
    if (!onChange) return;
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }
    if (iso <= checkIn) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }
    if (rangeContainsBlocked(checkIn, iso, blockedSet)) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }
    onChange({ checkIn, checkOut: iso });
  };

  const renderMonth = (base: Date) => {
    const year = base.getFullYear();
    const month = base.getMonth();
    const total = daysInMonth(year, month);
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) cells.push(null);
    for (let d = 1; d <= total; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const weekdayMap: Record<string, string> = {
      pt: 'pt-PT',
      en: 'en-GB',
      es: 'es-ES',
      de: 'de-DE',
    };
    const weekdays: string[] = [];
    for (let i = 1; i <= 7; i++) {
      const d = new Date(2024, 0, i);
      weekdays.push(
        d.toLocaleDateString(weekdayMap[locale] || 'en-GB', { weekday: 'short' }).slice(0, 3)
      );
    }

    return (
      <div className="flex-1 min-w-0">
        {/* Month name */}
        <div className="text-center text-base font-bold text-gray-900 mb-3 capitalize">
          {monthLabel(base, locale)}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {weekdays.map((w, i) => (
            <div key={i} className="text-center py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square bg-gray-50/50" />;
            const iso = toISO(d);
            const isPast = d < today;
            const isToday = iso === todayISO;
            const isBlocked = blockedSet.has(iso);
            const isCheckIn = iso === checkIn;
            const isCheckOut = iso === checkOut;
            const holidayName = holidayMap.get(iso);

            let inRange = false;
            if (checkIn && checkOut) {
              inRange = iso > checkIn && iso < checkOut;
            } else if (checkIn && hoverDate && hoverDate > checkIn) {
              inRange = iso > checkIn && iso < hoverDate;
            }

            const disabled = isPast || isBlocked;

            // Build classes
            let bgClass = 'bg-white';
            let textClass = 'text-gray-800';
            let extraClass = 'hover:bg-blue-50 cursor-pointer';

            if (disabled) {
              if (isBlocked) {
                bgClass = 'bg-red-50/80';
                textClass = 'text-red-300 line-through';
                extraClass = 'cursor-not-allowed';
              } else {
                bgClass = 'bg-gray-50/50';
                textClass = 'text-gray-300';
                extraClass = 'cursor-not-allowed';
              }
            } else if (isCheckIn || isCheckOut) {
              bgClass = 'bg-accent';
              textClass = 'text-white font-bold';
              extraClass = 'cursor-pointer shadow-inner';
            } else if (inRange) {
              bgClass = 'bg-accent/10';
              textClass = 'text-accent font-semibold';
              extraClass = 'cursor-pointer';
            }

            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => setHoverDate(iso)}
                onMouseLeave={() => setHoverDate(null)}
                className={`aspect-square flex flex-col items-center justify-center relative transition-all ${bgClass} ${textClass} ${extraClass}`}
                title={holidayName ?? undefined}
              >
                {/* Today indicator */}
                {isToday && !isCheckIn && !isCheckOut && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-accent" />
                )}
                <span className="text-sm lg:text-base">{d.getDate()}</span>
                {holidayName && (
                  <span className="absolute bottom-1 w-1 h-1 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const nextMonth = addMonths(viewMonth, 1);
  const nights = checkIn && checkOut ? diffNights(checkIn, checkOut) : 0;

  return (
    <div>
      {/* Check-in / Check-out summary */}
      <div className="grid grid-cols-2 gap-3 mb-5 max-w-md mx-auto">
        <div className={`rounded-xl p-3.5 text-center border-2 transition-colors ${checkIn ? 'border-accent bg-accent/5' : 'border-gray-200 bg-gray-50'}`}>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t('checkIn')}</div>
          <div className={`text-base font-bold mt-0.5 ${checkIn ? 'text-accent' : 'text-gray-300'}`}>
            {checkIn ? formatDateDisplay(checkIn, locale) : '—'}
          </div>
        </div>
        <div className={`rounded-xl p-3.5 text-center border-2 transition-colors ${checkOut ? 'border-accent bg-accent/5' : 'border-gray-200 bg-gray-50'}`}>
          <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t('checkOut')}</div>
          <div className={`text-base font-bold mt-0.5 ${checkOut ? 'text-accent' : 'text-gray-300'}`}>
            {checkOut ? formatDateDisplay(checkOut, locale) : '—'}
          </div>
        </div>
      </div>

      {nights > 0 && (
        <div className="text-center mb-5">
          <span className="inline-flex items-center gap-1.5 bg-accent/10 text-accent font-bold text-sm px-4 py-1.5 rounded-full">
            {nights} {t('nights')}
          </span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => {
            const prev = addMonths(viewMonth, -1);
            const earliest = new Date(today.getFullYear(), today.getMonth(), 1);
            if (prev >= earliest) setViewMonth(prev);
          }}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label={t('previousMonth')}
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label={t('nextMonth')}
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* Calendars */}
      <div className="flex flex-col md:flex-row gap-6">
        {renderMonth(viewMonth)}
        <div className="hidden md:block">{renderMonth(nextMonth)}</div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 mt-5 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-200" />
          <span>{t('selectDates')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-accent" />
          <span>{t('checkIn')} / {t('checkOut')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-200" />
          <span>{t('unavailable')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>{t('holiday')}</span>
        </div>
      </div>

      {loading && (
        <div className="text-center text-xs text-gray-300 mt-3 animate-pulse">…</div>
      )}
    </div>
  );
}
