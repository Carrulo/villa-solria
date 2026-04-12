'use client';

import { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

type Props = {
  startingPrice: number;
};

export default function MobileBookingBar({ startingPrice }: Props) {
  const t = useTranslations('pricing');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const target = document.getElementById('booking-form-section');
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Hide the bar when the booking form is in view
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 leading-tight">{t('startingAt')}</p>
          <p className="text-lg font-bold text-gray-900 leading-tight">
            {startingPrice}&euro;
            <span className="text-xs font-normal text-gray-500">{t('perNight')}</span>
          </p>
        </div>
        <a
          href="#booking-form-section"
          className="inline-flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-full px-5 py-3 text-sm shadow-md shadow-accent/25 transition-all shrink-0"
        >
          <Calendar size={16} />
          {t('reserveNow')}
        </a>
      </div>
    </div>
  );
}
