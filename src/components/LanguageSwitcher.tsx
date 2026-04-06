'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

const localeLabels: Record<string, string> = {
  pt: 'PT',
  en: 'EN',
  es: 'ES',
  de: 'DE',
};

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const handleChange = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as 'pt' | 'en' | 'es' | 'de' });
  };

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            locale === loc
              ? 'bg-primary text-white'
              : 'text-gray-500 hover:text-primary hover:bg-gray-100'
          }`}
        >
          {localeLabels[loc]}
        </button>
      ))}
    </div>
  );
}
