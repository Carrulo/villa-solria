import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const SITE_URL = 'https://villasolria.com';

const OG_LOCALE: Record<string, string> = {
  pt: 'pt_PT',
  en: 'en_US',
  es: 'es_ES',
  de: 'de_DE',
};

/** PT is the default locale and has no prefix (localePrefix: 'as-needed'). */
export function localePath(locale: string, path: string): string {
  const prefix = locale === routing.defaultLocale ? '' : `/${locale}`;
  return `${prefix}${path}` || '/';
}

/**
 * Per-page title, description, canonical, hreflang and Open Graph.
 *
 * The locale layout used to declare `alternates.languages` once, pointing
 * at the homepage, and every subpage inherited it — so /en/villa told
 * Google its German version was /de. Next merges metadata shallowly, so a
 * page that sets `openGraph` replaces the layout's whole object; the image
 * and site name are repeated here for that reason.
 */
export function pageMetadata(
  locale: string,
  path: string,
  title: string,
  description?: string
): Metadata {
  const url = localePath(locale, path);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: Object.fromEntries([
        ...routing.locales.map((l) => [l, localePath(l, path)]),
        ['x-default', localePath(routing.defaultLocale, path)],
      ]),
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: OG_LOCALE[locale] ?? 'pt_PT',
      siteName: 'Villa Solria',
      images: [{ url: '/og-image.jpg', width: 1200, height: 630, alt: 'Villa Solria - Cabanas de Tavira' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.jpg'],
    },
  };
}
