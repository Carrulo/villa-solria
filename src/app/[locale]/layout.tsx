import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { FooterSettings } from '@/components/Footer';
import WhatsAppButton from '@/components/WhatsAppButton';
import CookieConsent from '@/components/CookieConsent';
import Analytics from '@/components/Analytics';
import '../globals.css';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

const FOOTER_DEFAULTS: FooterSettings = {
  email: 'bruno@kontrolsat.com',
  phone: '+351 912 345 678',
  whatsapp: '+351 912 345 678',
  address1: 'Rua do Junco 3.5B',
  address2: '8800-591 Tavira, Portugal',
  complaintsUrl: 'https://www.livroreclamacoes.pt',
  privacyUrl: '',
  termsUrl: '',
  license: '120108/AL',
};

async function getFooterSettings(): Promise<Partial<FooterSettings>> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) return {};

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', [
        'contact_email',
        'contact_phone',
        'whatsapp_number',
        'address_line1',
        'address_line2',
        'complaints_url',
        'privacy_url',
        'terms_url',
        'al_license',
      ]);

    if (error || !data) return {};

    const map: Record<string, string> = {};
    data.forEach((row: { key: string; value: unknown }) => {
      map[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    });

    return {
      email: map.contact_email || FOOTER_DEFAULTS.email,
      phone: map.contact_phone || FOOTER_DEFAULTS.phone,
      whatsapp: map.whatsapp_number || map.contact_phone || FOOTER_DEFAULTS.phone,
      address1: map.address_line1 || FOOTER_DEFAULTS.address1,
      address2: map.address_line2 || FOOTER_DEFAULTS.address2,
      complaintsUrl: map.complaints_url ?? FOOTER_DEFAULTS.complaintsUrl,
      privacyUrl: map.privacy_url ?? FOOTER_DEFAULTS.privacyUrl,
      termsUrl: map.terms_url ?? FOOTER_DEFAULTS.termsUrl,
      license: map.al_license || FOOTER_DEFAULTS.license,
    };
  } catch {
    return {};
  }
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return {
    metadataBase: new URL('https://villasolria.com'),
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('title'),
      description: t('description'),
      type: 'website',
      locale: locale === 'pt' ? 'pt_PT' : locale === 'en' ? 'en_US' : locale === 'es' ? 'es_ES' : 'de_DE',
      siteName: 'Villa Solria',
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: 'Villa Solria - Cabanas de Tavira',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og-image.jpg'],
    },
    alternates: {
      languages: {
        'pt': '/',
        'en': '/en',
        'es': '/es',
        'de': '/de',
        'x-default': '/',
      },
    },
    icons: {
      icon: '/favicon.svg',
      apple: '/favicon.svg',
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as typeof routing.locales[number])) {
    notFound();
  }

  let messages;
  try {
    messages = (await import(`../../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }

  const footerSettings = await getFooterSettings();

  // Fetch GA4 ID for server-side script injection (Consent Mode v2)
  let ga4Id = '';
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const sb = createClient(supabaseUrl, supabaseKey);
      const { data: ga4Row } = await sb
        .from('settings')
        .select('value')
        .eq('key', 'ga4_measurement_id')
        .single();
      ga4Id = (ga4Row?.value as string) || '';
    }
  } catch { /* optional */ }

  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        {/* Google Consent Mode v2 — default denied until user accepts */}
        {ga4Id && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('consent', 'default', {
                    'analytics_storage': 'denied',
                    'ad_storage': 'denied',
                    'ad_user_data': 'denied',
                    'ad_personalization': 'denied',
                    'wait_for_update': 500
                  });
                  gtag('js', new Date());
                  gtag('config', '${ga4Id}');
                `,
              }}
            />
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header />
          <main className="flex-1 pt-16 lg:pt-20">{children}</main>
          <Footer settings={footerSettings} />
          <WhatsAppButton phoneNumber={footerSettings.whatsapp} />
          <CookieConsent />
          <Analytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
