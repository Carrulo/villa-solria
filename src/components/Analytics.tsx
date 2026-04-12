'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, Suspense } from 'react';

/* ──────────── Cookie consent helpers ──────────── */

const STORAGE_KEY = 'villa-solria-cookie-consent';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

function getConsent(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ──────────── Tracking IDs ──────────── */

interface TrackingIds {
  ga4_measurement_id: string;
  meta_pixel_id: string;
}

/* ──────────── Global type augmentation ──────────── */

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
    fbq: (...args: unknown[]) => void;
    _fbq: (...args: unknown[]) => void;
  }
}

/* ──────────── Public tracking API ──────────── */

/**
 * Fire a GA4 event. No-op if gtag is not loaded.
 */
export function trackGA4Event(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

/**
 * Fire a Meta Pixel event. No-op if fbq is not loaded.
 */
export function trackMetaEvent(
  eventName: string,
  params?: Record<string, unknown>
) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', eventName, params);
  }
}

/* ──────────── Inner component (uses useSearchParams) ──────────── */

function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [consent, setConsent] = useState<CookiePreferences | null>(null);
  const [ids, setIds] = useState<TrackingIds | null>(null);
  const [ga4Ready, setGa4Ready] = useState(false);
  const [metaReady, setMetaReady] = useState(false);

  // Fetch tracking IDs once
  useEffect(() => {
    fetch('/api/settings/tracking')
      .then((r) => r.json())
      .then((data: TrackingIds) => setIds(data))
      .catch(() => {});
  }, []);

  // Read initial consent & listen for updates
  useEffect(() => {
    setConsent(getConsent());

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<CookiePreferences>).detail;
      setConsent(detail);
    };

    window.addEventListener('cookie-consent-updated', handler);
    return () => window.removeEventListener('cookie-consent-updated', handler);
  }, []);

  // ── GA4 page view tracking ──
  const sendGA4PageView = useCallback(() => {
    if (!ga4Ready || !ids?.ga4_measurement_id) return;
    window.gtag('config', ids.ga4_measurement_id, {
      page_path: pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''),
    });
  }, [ga4Ready, ids?.ga4_measurement_id, pathname, searchParams]);

  useEffect(() => {
    sendGA4PageView();
  }, [sendGA4PageView]);

  // ── Meta Pixel page view tracking ──
  useEffect(() => {
    if (!metaReady) return;
    window.fbq('track', 'PageView');
  }, [metaReady, pathname]);

  const shouldLoadGA4 = consent?.analytics && ids?.ga4_measurement_id;
  const shouldLoadMeta = consent?.marketing && ids?.meta_pixel_id;

  return (
    <>
      {/* ── GA4 ── */}
      {shouldLoadGA4 && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ids.ga4_measurement_id}`}
            strategy="afterInteractive"
            onLoad={() => {
              window.dataLayer = window.dataLayer || [];
              window.gtag = function gtag() {
                // eslint-disable-next-line prefer-rest-params
                window.dataLayer.push(arguments);
              };
              window.gtag('js', new Date());
              window.gtag('config', ids.ga4_measurement_id, {
                page_path: pathname,
              });
              setGa4Ready(true);
            }}
          />
        </>
      )}

      {/* ── Meta Pixel ── */}
      {shouldLoadMeta && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          onLoad={() => setMetaReady(true)}
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${ids.meta_pixel_id}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
    </>
  );
}

/* ──────────── Wrapper with Suspense (required for useSearchParams) ──────────── */

export default function Analytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsInner />
    </Suspense>
  );
}
