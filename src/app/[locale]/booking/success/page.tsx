'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, Suspense } from 'react';
import { CheckCircle, Home, Mail, Calendar, Users, Receipt, Copy, Check } from 'lucide-react';
import { trackGA4Event, trackMetaEvent } from '@/components/Analytics';

interface BookingDetails {
  reference: string;
  guest_name: string;
  checkin_date: string;
  checkout_date: string;
  num_nights: number;
  num_guests: number;
  total_price: number;
  status: string;
  payment_status: string;
}

function BookingSuccessContent() {
  const t = useTranslations('bookingStatus');
  const searchParams = useSearchParams();
  const tracked = useRef(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const sessionId = searchParams.get('session_id');
    if (!sessionId) return;

    // Fetch booking details from Stripe session
    fetch(`/api/checkout/session?session_id=${sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        const value = data.amount_total ? data.amount_total / 100 : 0;
        const transactionId = data.payment_intent || sessionId;

        if (data.booking) {
          setBooking(data.booking);
        }
        if (data.receipt_url) {
          setReceiptUrl(data.receipt_url);
        }

        trackGA4Event('purchase', {
          transaction_id: transactionId,
          currency: 'EUR',
          value,
          items: [
            {
              item_name: 'Villa Solria Booking',
              price: value,
              quantity: 1,
            },
          ],
        });

        trackMetaEvent('Purchase', {
          currency: 'EUR',
          value,
        });
      })
      .catch(() => {
        trackGA4Event('purchase', {
          transaction_id: sessionId,
          currency: 'EUR',
          value: 0,
        });
        trackMetaEvent('Purchase', {
          currency: 'EUR',
          value: 0,
        });
      });
  }, [searchParams]);

  function copyReference() {
    if (!booking?.reference) return;
    navigator.clipboard.writeText(booking.reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="py-20 lg:py-32">
      <div className="max-w-lg mx-auto px-4 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {t('successTitle')}
        </h1>
        <p className="text-gray-600 mb-2">
          {t('successDesc')}
        </p>

        {/* Booking reference */}
        {booking?.reference && (
          <div className="mt-6 mb-6">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
              {t('reference') ?? 'Reference'}
            </p>
            <button
              onClick={copyReference}
              className="inline-flex items-center gap-2 text-2xl font-bold text-blue-600 tracking-wider hover:text-blue-700 transition-colors"
              title="Copy reference"
            >
              {booking.reference}
              {copied ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-gray-400" />}
            </button>
          </div>
        )}

        {/* Booking summary card */}
        {booking && (
          <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 mb-6 text-left">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  <Calendar size={12} />
                  Check-in
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatDate(booking.checkin_date)}</p>
                <p className="text-xs text-blue-600 font-medium">16:00</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  <Calendar size={12} />
                  Check-out
                </div>
                <p className="text-sm font-semibold text-gray-900">{formatDate(booking.checkout_date)}</p>
                <p className="text-xs text-blue-600 font-medium">11:00</p>
              </div>
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  {t('nights') ?? 'Nights'}
                </div>
                <p className="text-sm font-semibold text-gray-900">{booking.num_nights}</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">
                  <Users size={12} />
                  {t('guests') ?? 'Guests'}
                </div>
                <p className="text-sm font-semibold text-gray-900">{booking.num_guests}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">{t('totalPaid') ?? 'Total paid'}</span>
              <span className="text-xl font-bold text-gray-900">{booking.total_price.toFixed(2)} &euro;</span>
            </div>
          </div>
        )}

        <p className="text-sm text-gray-400 mb-4 flex items-center justify-center gap-1.5">
          <Mail size={14} />
          {t('successEmail')}
        </p>

        {/* Receipt link */}
        {receiptUrl && (
          <a
            href={receiptUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium mb-6"
          >
            <Receipt size={16} />
            {t('viewReceipt') ?? 'View Receipt'}
          </a>
        )}

        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-colors"
          >
            <Home size={18} />
            {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={null}>
      <BookingSuccessContent />
    </Suspense>
  );
}
