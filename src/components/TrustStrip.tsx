'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Lock, BadgeCheck, RotateCcw } from 'lucide-react';

/**
 * Trust signals row shown right before the "Pay" button on the booking
 * form. Communicates: secure payment, license, real owner, refund policy.
 *
 * Designed compact for mobile — stacks 2x2 on small screens, 4 in a row on desktop.
 */
export default function TrustStrip() {
  const t = useTranslations('trust');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-y border-gray-100">
      <div className="flex flex-col items-center text-center gap-1.5">
        <Lock size={20} className="text-primary" />
        <p className="text-xs text-gray-700 font-medium leading-tight">{t('stripe')}</p>
      </div>

      <div className="flex flex-col items-center text-center gap-1.5">
        <BadgeCheck size={20} className="text-primary" />
        <p className="text-xs text-gray-700 font-medium leading-tight">{t('license')}</p>
      </div>

      <div className="flex flex-col items-center text-center gap-1.5">
        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 ring-1 ring-gray-200">
          <Image
            src="/images/owner/bruno.png"
            alt="Bruno Carrulo"
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="text-xs text-gray-700 font-medium leading-tight">{t('owner')}</p>
      </div>

      <div className="flex flex-col items-center text-center gap-1.5">
        <RotateCcw size={20} className="text-primary" />
        <p className="text-xs text-gray-700 font-medium leading-tight">{t('refund')}</p>
      </div>
    </div>
  );
}
