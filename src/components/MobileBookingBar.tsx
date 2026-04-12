'use client';

import { useEffect, useState, useCallback } from 'react';
import { Calendar, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import BookingForm from './BookingForm';

type Props = {
  startingPrice: number;
};

export default function MobileBookingBar({ startingPrice }: Props) {
  const t = useTranslations('pricing');
  const [visible, setVisible] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const target = document.getElementById('booking-form-section');
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <>
      {/* Sticky bottom bar */}
      {visible && !drawerOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 leading-tight">{t('startingAt')}</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">
                {startingPrice}&euro;
                <span className="text-xs font-normal text-gray-500">{t('perNight')}</span>
              </p>
            </div>
            <button
              onClick={openDrawer}
              className="inline-flex items-center justify-center gap-1.5 bg-accent hover:bg-accent/90 text-white font-semibold rounded-full px-5 py-3 text-sm shadow-md shadow-accent/25 transition-all shrink-0"
            >
              <Calendar size={16} />
              {t('reserveNow')}
            </button>
          </div>
        </div>
      )}

      {/* Full-screen drawer/modal */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Drawer panel */}
          <div className="absolute inset-x-0 bottom-0 top-12 bg-white rounded-t-3xl shadow-2xl flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">{t('reserveNow')}</h3>
              <button
                onClick={closeDrawer}
                className="p-2 -mr-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X size={22} className="text-gray-500" />
              </button>
            </div>

            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <BookingForm />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
