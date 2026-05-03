'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import { Calendar, X } from 'lucide-react';
import BookingForm from './BookingForm';

/**
 * Floating "Book now" CTA shown on every page after the user scrolls
 * past the first viewport. On mobile sits bottom-left so it doesn't
 * overlap WhatsApp (bottom-right). On desktop sits next to WhatsApp.
 *
 * Click opens a modal with the existing BookingForm so the visitor
 * never has to leave the page they're on just to start a reservation.
 */
export default function FloatingBookCTA() {
  const t = useTranslations('hero');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // /pricing already has its own sticky MobileBookingBar — hide here.
  const onPricing = pathname?.includes('/pricing') ?? false;

  // Show after first viewport scroll, hide when the footer is in view
  // so the pill doesn't overlap the footer Facebook button on mobile.
  useEffect(() => {
    const handler = () => {
      const past = window.scrollY > window.innerHeight * 0.6;
      const nearBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 220;
      setScrolled(past && !nearBottom);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler);
      window.removeEventListener('resize', handler);
    };
  }, []);

  // Close modal with Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (onPricing) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('cta')}
        className={`flex fixed z-40 items-center gap-2 px-5 py-3 rounded-full bg-accent hover:bg-accent-hover text-white font-semibold shadow-lg shadow-accent/30 transition-all bottom-5 left-4 md:bottom-6 md:left-auto md:right-24 ${
          scrolled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <Calendar size={18} />
        <span>{t('cta')}</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            className="relative w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto bg-white rounded-t-3xl md:rounded-3xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="sticky top-3 ml-auto mr-3 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-gray-100 flex items-center justify-center shadow border border-gray-200"
            >
              <X size={18} className="text-gray-700" />
            </button>
            <div className="p-4 md:p-6 -mt-9">
              <BookingForm />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
