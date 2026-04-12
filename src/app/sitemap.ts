import type { MetadataRoute } from 'next';

const BASE_URL = 'https://villasolria.com';

const locales = ['pt', 'en', 'es', 'de'] as const;
const defaultLocale = 'pt';

// All public pages (path segments under /[locale]/)
const pages = [
  '',           // homepage
  '/pricing',
  '/contact',
  '/reviews',
  '/faq',
  '/gallery',
  '/location',
  '/villa',
  '/legal/terms',
  '/legal/privacy',
];

function getLocalePath(locale: string, path: string): string {
  // PT is the default locale — no prefix (localePrefix: 'as-needed')
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  return `${BASE_URL}${prefix}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return pages.map((page) => ({
    url: getLocalePath(defaultLocale, page),
    lastModified,
    alternates: {
      languages: Object.fromEntries([
        ...locales.map((locale) => [locale, getLocalePath(locale, page)]),
        ['x-default', getLocalePath(defaultLocale, page)],
      ]),
    },
  }));
}
