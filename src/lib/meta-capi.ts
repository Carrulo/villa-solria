/**
 * Meta Conversions API (CAPI) — server-side event helper.
 *
 * Why we need this:
 *  - Browser-side Pixel is blocked by adblockers, ITP (Safari/iOS), and the
 *    cookie consent banner. In the EU we typically lose 40-70% of events.
 *  - Server-side events are unaffected by all of the above and let Meta
 *    optimise on real Purchases, which is required for OUTCOME_SALES
 *    campaigns to be effective.
 *
 * Dedup with browser:
 *  - Each event must carry the SAME `event_id` on both sides.
 *  - We use deterministic IDs derived from the booking ID so the browser
 *    code (success page / BookingForm) can reproduce them without any
 *    coordination.
 *
 * Settings (Supabase `settings` table):
 *  - `meta_pixel_id`     — required (already used by browser Pixel)
 *  - `meta_capi_token`   — required (System User token from Events Manager)
 *  - `meta_test_event_code` — optional, only while testing in Events Manager
 *
 * Reference:
 *  https://developers.facebook.com/docs/marketing-api/conversions-api/
 */

import crypto from 'node:crypto';
import { createServerClient } from '@/lib/supabase-server';

const GRAPH_API_VERSION = 'v21.0';

type SupportedEventName =
  | 'PageView'
  | 'ViewContent'
  | 'InitiateCheckout'
  | 'Purchase'
  | 'Lead';

export interface UserData {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  country?: string | null;
  /** Visitor IP — must come from the original request (x-forwarded-for) */
  clientIp?: string | null;
  /** Visitor user-agent — must come from the original request */
  userAgent?: string | null;
  /** _fbp cookie value if available */
  fbp?: string | null;
  /** _fbc cookie value (or constructed from fbclid) */
  fbc?: string | null;
}

export interface CustomData {
  currency?: string;
  value?: number;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  numItems?: number;
  /** Any extra fields you want to forward (snake_case as required by Meta) */
  extra?: Record<string, unknown>;
}

export interface SendEventOptions {
  /**
   * Stable identifier so browser + server events deduplicate.
   * Recommended: `purchase_<bookingId>`, `checkout_<bookingId>`.
   */
  eventId: string;
  /** When the event happened (defaults to now). */
  eventTime?: number;
  /** URL where the event happened, if known. */
  eventSourceUrl?: string;
  /** "website" by default. */
  actionSource?: 'website' | 'email' | 'app' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other';
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Hashing helpers — Meta requires SHA-256 for PII fields                  */
/* ──────────────────────────────────────────────────────────────────────── */

function sha256(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return undefined;
  return crypto.createHash('sha256').update(trimmed).digest('hex');
}

function normalizePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  // Strip everything except digits — Meta expects E.164 without "+".
  const digits = phone.replace(/\D/g, '');
  return digits || undefined;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Settings loader                                                         */
/* ──────────────────────────────────────────────────────────────────────── */

interface CapiSettings {
  pixelId: string;
  accessToken: string;
  testEventCode?: string;
}

let cachedSettings: { value: CapiSettings | null; expiresAt: number } | null = null;
const SETTINGS_TTL_MS = 60_000;

async function loadSettings(): Promise<CapiSettings | null> {
  const now = Date.now();
  if (cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.value;
  }

  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['meta_pixel_id', 'meta_capi_token', 'meta_test_event_code']);

    const map: Record<string, string> = {};
    for (const row of data ?? []) {
      const key = row.key as string;
      const raw = row.value;
      map[key] = typeof raw === 'string' ? raw : String(raw ?? '');
    }

    const pixelId = map['meta_pixel_id']?.trim();
    const accessToken = map['meta_capi_token']?.trim();
    const testEventCode = map['meta_test_event_code']?.trim() || undefined;

    const value: CapiSettings | null =
      pixelId && accessToken ? { pixelId, accessToken, testEventCode } : null;

    cachedSettings = { value, expiresAt: now + SETTINGS_TTL_MS };
    return value;
  } catch (err) {
    console.error('[meta-capi] Failed to load settings:', err);
    return null;
  }
}

/** Force a reload on the next sendMetaEvent call (e.g. after admin saves). */
export function invalidateMetaCapiSettings() {
  cachedSettings = null;
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Public API                                                              */
/* ──────────────────────────────────────────────────────────────────────── */

/**
 * Send a single event to the Meta Conversions API. Never throws — failures
 * are logged and the function returns `false` so callers can ignore.
 *
 * Browser-side and server-side events with the same `eventId` will be
 * deduplicated by Meta (window: 7 days).
 */
export async function sendMetaEvent(
  eventName: SupportedEventName,
  userData: UserData,
  customData: CustomData,
  options: SendEventOptions,
): Promise<boolean> {
  const settings = await loadSettings();
  if (!settings) {
    // CAPI not configured — quietly skip so dev environments don't error.
    return false;
  }

  const eventTime = options.eventTime ?? Math.floor(Date.now() / 1000);

  const payloadUserData: Record<string, unknown> = {
    em: sha256(userData.email),
    ph: sha256(normalizePhone(userData.phone)),
    fn: sha256(userData.firstName),
    ln: sha256(userData.lastName),
    ct: sha256(userData.city),
    country: sha256(userData.country),
    client_ip_address: userData.clientIp || undefined,
    client_user_agent: userData.userAgent || undefined,
    fbp: userData.fbp || undefined,
    fbc: userData.fbc || undefined,
  };

  // Strip undefined to avoid sending empty fields.
  for (const key of Object.keys(payloadUserData)) {
    if (payloadUserData[key] === undefined) {
      delete payloadUserData[key];
    }
  }

  const payloadCustomData: Record<string, unknown> = {
    currency: customData.currency,
    value: customData.value,
    content_name: customData.contentName,
    content_category: customData.contentCategory,
    content_ids: customData.contentIds,
    num_items: customData.numItems,
    ...customData.extra,
  };

  for (const key of Object.keys(payloadCustomData)) {
    if (payloadCustomData[key] === undefined) {
      delete payloadCustomData[key];
    }
  }

  const event = {
    event_name: eventName,
    event_time: eventTime,
    event_id: options.eventId,
    event_source_url: options.eventSourceUrl,
    action_source: options.actionSource ?? 'website',
    user_data: payloadUserData,
    custom_data: payloadCustomData,
  };

  const body: Record<string, unknown> = {
    data: [event],
  };

  if (settings.testEventCode) {
    body.test_event_code = settings.testEventCode;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${settings.pixelId}/events?access_token=${encodeURIComponent(
    settings.accessToken,
  )}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error(
        `[meta-capi] ${eventName} failed (${res.status}):`,
        text.slice(0, 500),
      );
      return false;
    }

    const json = (await res.json().catch(() => ({}))) as {
      events_received?: number;
      fbtrace_id?: string;
    };
    console.log(
      `[meta-capi] ${eventName} sent (event_id=${options.eventId}, received=${
        json.events_received ?? '?'
      })`,
    );
    return true;
  } catch (err) {
    console.error(`[meta-capi] ${eventName} network error:`, err);
    return false;
  }
}

/* ──────────────────────────────────────────────────────────────────────── */
/*  Convenience builders for deterministic event IDs                        */
/* ──────────────────────────────────────────────────────────────────────── */

export const eventIdFor = {
  purchase: (bookingId: string) => `purchase_${bookingId}`,
  initiateCheckout: (bookingId: string) => `checkout_${bookingId}`,
  lead: (bookingId: string) => `lead_${bookingId}`,
} as const;

/* ──────────────────────────────────────────────────────────────────────── */
/*  Header helpers — extract IP / UA from a Next.js request                 */
/* ──────────────────────────────────────────────────────────────────────── */

export function extractClientContext(request: Request): {
  clientIp: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
} {
  const headers = request.headers;
  const xff = headers.get('x-forwarded-for') || '';
  const clientIp = xff.split(',')[0]?.trim() || headers.get('x-real-ip') || null;
  const userAgent = headers.get('user-agent') || null;

  // _fbp / _fbc cookies — Meta uses these to match server events with browser
  // sessions even when the user never gave consent for marketing cookies on
  // the website (Meta's cookies are first-party from connect.facebook.net).
  const cookieHeader = headers.get('cookie') || '';
  const fbp = matchCookie(cookieHeader, '_fbp');
  const fbc = matchCookie(cookieHeader, '_fbc');

  return { clientIp, userAgent, fbp, fbc };
}

function matchCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}
