'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type DateRange = {
  checkIn: string | null; // YYYY-MM-DD
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
  // Iterate from checkIn (inclusive) to checkOut (exclusive)
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
      .catch(() => {
        /* swallow */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const blockedSet = useMemo(() => new Set(blocked.map((b) => b.date)), [blocked]);

  const handleDayClick = (iso: string) => {
    if (!onChange) return;
    // Starting fresh or resetting
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }
    // Have checkIn, picking checkOut
    if (iso <= checkIn) {
      // Clicked earlier or same date → reset to new check-in
      onChange({ checkIn: iso, checkOut: null });
      return;
    }
    // Validate range doesn't cross blocked
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
    // Week starts on Monday (ISO)
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
      const d = new Date(2024, 0, i); // Mon Jan 1 2024
      weekdays.push(
        d.toLocaleDateString(weekdayMap[locale] || 'en-GB', { weekday: 'narrow' })
      );
    }

    return (
      <div className="flex-1 min-w-0">
        <div className="text-center text-base lg:text-lg font-semibold text-gray-900 mb-4 capitalize">
          {monthLabel(base, locale)}
        </div>
        <div className="grid grid-cols-7 gap-1.5 text-xs text-gray-500 uppercase mb-2 font-medium">
          {weekdays.map((w, i) => (
            <div key={i} className="text-center py-1.5">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} className="aspect-square" />;
            const iso = toISO(d);
            const isPast = d < today;
            const isBlocked = blockedSet.has(iso);
            const isCheckIn = iso === checkIn;
            const isCheckOut = iso === checkOut;

            let inRange = false;
            if (checkIn && checkOut) {
              inRange = iso > checkIn && iso < checkOut;
            } else if (checkIn && hoverDate && hoverDate > checkIn) {
              inRange = iso > checkIn && iso < hoverDate;
            }

            const disabled = isPast || isBlocked;

            let classes =
              'aspect-square flex items-center justify-center text-sm lg:text-base rounded-lg transition-colors select-none font-medium ';
            if (disabled) {
              if (isBlocked) {
                classes += 'bg-red-50 text-red-400 line-through cursor-not-allowed';
              } else {
                classes += 'text-gray-300 cursor-not-allowed';
              }
            } else if (isCheckIn || isCheckOut) {
              classes += 'bg-accent text-white font-semibold cursor-pointer shadow-md';
            } else if (inRange) {
              classes += 'bg-accent/15 text-gray-900 cursor-pointer';
            } else {
              classes +=
                'bg-white text-gray-700 hover:bg-accent/10 cursor-pointer border border-transparent';
            }

            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handleDayClick(iso)}
                onMouseEnter={() => setHoverDate(iso)}
                onMouseLeave={() => setHoverDate(null)}
                className={classes}
              >
                {d.getDate()}
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
    <div className="bg-white rounded-2xl p-6 lg:p-8 border border-gray-100 shadow-sm">
      <div className="text-center mb-6">
        <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-1">{t('title')}</h3>
        <p className="text-base text-gray-500">{t('subtitle')}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5 max-w-md mx-auto">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-medium">{t('checkIn')}</div>
          <div className="text-base font-semibold text-gray-900 mt-1">
            {checkIn ? formatDateDisplay(checkIn, locale) : '—'}
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <div className="text-xs uppercase tracking-wide text-gray-500 font-medium">{t('checkOut')}</div>
          <div className="text-base font-semibold text-gray-900 mt-1">
            {checkOut ? formatDateDisplay(checkOut, locale) : '—'}
          </div>
        </div>
      </div>
      {nights > 0 && (
        <div className="text-center text-base text-gray-700 font-medium mb-5">
          {nights} {t('nights')}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mb-4 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => {
            const prev = addMonths(viewMonth, -1);
            const earliest = new Date(today.getFullYear(), today.getMonth(), 1);
            if (prev >= earliest) setViewMonth(prev);
          }}
          className="p-2.5 rounded-lg hover:bg-gray-100 text-gray-600 border border-gray-200"
          aria-label={t('previousMonth')}
        >
          <ChevronLeft size={20} />
        </button>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-2.5 rounded-lg hover:bg-gray-100 text-gray-600 border border-gray-200"
          aria-label={t('nextMonth')}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Calendars */}
      <div className="flex flex-col md:flex-row gap-8 lg:gap-12 max-w-4xl mx-auto">
        {renderMonth(viewMonth)}
        <div className="hidden md:block">{renderMonth(nextMonth)}</div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center flex-wrap gap-4 mt-6 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-white border border-gray-200" />
          <span>{t('selectDates')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-accent" />
          <span>{t('checkIn')} / {t('checkOut')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-50 border border-red-100" />
          <span>{t('unavailable')}</span>
        </div>
      </div>

      {loading && (
        <div className="text-center text-xs text-gray-400 mt-3">…</div>
      )}
    </div>
  );
}
