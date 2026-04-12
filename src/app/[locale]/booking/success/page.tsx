'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { CheckCircle, Home, Mail } from 'lucide-react';

export default function BookingSuccessPage() {
  const t = useTranslations('bookingStatus');

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
        <p className="text-sm text-gray-400 mb-8 flex items-center justify-center gap-1.5">
          <Mail size={14} />
          {t('successEmail')}
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-colors"
        >
          <Home size={18} />
          {t('backHome')}
        </Link>
      </div>
    </div>
  );
}
