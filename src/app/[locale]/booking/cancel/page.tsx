'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { XCircle, ArrowLeft } from 'lucide-react';

export default function BookingCancelPage() {
  const t = useTranslations('bookingStatus');

  return (
    <div className="py-20 lg:py-32">
      <div className="max-w-lg mx-auto px-4 text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} className="text-amber-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          {t('cancelTitle')}
        </h1>
        <p className="text-gray-600 mb-8">
          {t('cancelDesc')}
        </p>

        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft size={18} />
          {t('tryAgain')}
        </Link>
      </div>
    </div>
  );
}
