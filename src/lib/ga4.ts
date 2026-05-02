import { BetaAnalyticsDataClient } from '@google-analytics/data';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '534083614';

/**
 * Build a GA4 Data API client from the service account JSON env var.
 * Returns null if creds aren't configured (admin page renders empty state).
 */
export function getGa4Client(): BetaAnalyticsDataClient | null {
  // Prefer base64 to avoid quote-escaping issues on Vercel env vars.
  // Falls back to raw JSON if the base64 var isn't set.
  const b64 = process.env.GA4_SERVICE_ACCOUNT_B64;
  const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  let raw: string | undefined;
  if (b64) {
    try { raw = Buffer.from(b64, 'base64').toString('utf-8'); } catch { /* fall through */ }
  }
  if (!raw && rawJson) raw = rawJson;
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw);
    console.log('GA4 client init: project=', credentials.project_id, 'email=', credentials.client_email, 'key_chars=', credentials.private_key?.length);
    // When the JSON is stored as a raw env var with embedded `\n` in
    // private_key, the literal backslash-n needs to be turned back into
    // an actual newline before Google's auth library will accept the PEM.
    if (credentials.private_key && typeof credentials.private_key === 'string') {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }
    return new BetaAnalyticsDataClient({ credentials });
  } catch (err) {
    console.error('Invalid GA4 service account env var:', err);
    return null;
  }
}

export interface Ga4Snapshot {
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    avgSessionDurationSec: number;
  };
  topPages: Array<{ path: string; views: number }>;
  topCountries: Array<{ country: string; users: number }>;
  topSources: Array<{ source: string; users: number }>;
  devices: Array<{ device: string; users: number }>;
  ratePerDay: Array<{ date: string; users: number }>;
}

const empty: Ga4Snapshot = {
  totals: { activeUsers: 0, newUsers: 0, sessions: 0, avgSessionDurationSec: 0 },
  topPages: [],
  topCountries: [],
  topSources: [],
  devices: [],
  ratePerDay: [],
};

/**
 * Pull a full snapshot for the admin dashboard. One round-trip via batchRunReports.
 * @param days Lookback window. 7 or 30 are the usual choices.
 */
export async function fetchGa4Snapshot(days: number = 7): Promise<Ga4Snapshot> {
  const client = getGa4Client();
  if (!client) return empty;

  const property = `properties/${PROPERTY_ID}`;
  const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' };

  try {
    const [response] = await client.batchRunReports({
      property,
      requests: [
        {
          dimensions: [],
          metrics: [
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
            { name: 'averageSessionDuration' },
          ],
          dateRanges: [dateRange],
        },
        {
          dimensions: [{ name: 'pagePath' }],
          metrics: [{ name: 'screenPageViews' }],
          dateRanges: [dateRange],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 8,
        },
        {
          dimensions: [{ name: 'country' }],
          metrics: [{ name: 'activeUsers' }],
          dateRanges: [dateRange],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 8,
        },
        {
          dimensions: [{ name: 'sessionSource' }],
          metrics: [{ name: 'activeUsers' }],
          dateRanges: [dateRange],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 8,
        },
        {
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
          dateRanges: [dateRange],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        },
        {
          dimensions: [{ name: 'date' }],
          metrics: [{ name: 'activeUsers' }],
          dateRanges: [dateRange],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        },
      ],
    });

    const reports = response.reports || [];
    const get = (i: number) => reports[i];

    const totalsRow = get(0)?.rows?.[0];
    const totals = {
      activeUsers: Number(totalsRow?.metricValues?.[0]?.value || 0),
      newUsers: Number(totalsRow?.metricValues?.[1]?.value || 0),
      sessions: Number(totalsRow?.metricValues?.[2]?.value || 0),
      avgSessionDurationSec: Number(totalsRow?.metricValues?.[3]?.value || 0),
    };

    const topPages = (get(1)?.rows || []).map((r) => ({
      path: r.dimensionValues?.[0]?.value || '',
      views: Number(r.metricValues?.[0]?.value || 0),
    }));

    const topCountries = (get(2)?.rows || []).map((r) => ({
      country: r.dimensionValues?.[0]?.value || '',
      users: Number(r.metricValues?.[0]?.value || 0),
    }));

    const topSources = (get(3)?.rows || []).map((r) => ({
      source: r.dimensionValues?.[0]?.value || '',
      users: Number(r.metricValues?.[0]?.value || 0),
    }));

    const devices = (get(4)?.rows || []).map((r) => ({
      device: r.dimensionValues?.[0]?.value || '',
      users: Number(r.metricValues?.[0]?.value || 0),
    }));

    const ratePerDay = (get(5)?.rows || []).map((r) => ({
      date: r.dimensionValues?.[0]?.value || '',
      users: Number(r.metricValues?.[0]?.value || 0),
    }));

    return { totals, topPages, topCountries, topSources, devices, ratePerDay };
  } catch (err) {
    const e = err as { message?: string; code?: number; details?: string; stack?: string };
    console.error('GA4 fetch failed:', JSON.stringify({
      message: e.message,
      code: e.code,
      details: e.details,
      stack: e.stack?.split('\n').slice(0, 3),
    }));
    return empty;
  }
}
