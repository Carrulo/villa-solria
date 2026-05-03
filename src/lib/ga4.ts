import { JWT } from 'google-auth-library';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID || '534083614';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id?: string;
}

/**
 * Decode the SA credentials from base64 (preferred) or raw JSON env var.
 * Returns null if neither is configured.
 */
function getCredentials(): ServiceAccount | null {
  const b64 = process.env.GA4_SERVICE_ACCOUNT_B64;
  const rawJson = process.env.GA4_SERVICE_ACCOUNT_JSON;
  let raw: string | undefined;
  if (b64) {
    try { raw = Buffer.from(b64, 'base64').toString('utf-8'); } catch { /* try next */ }
  }
  if (!raw && rawJson) raw = rawJson;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccount;
    // Some env-var pipelines store the literal "\\n" instead of real newlines
    // inside private_key — un-escape so the PEM parser is happy.
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    return parsed;
  } catch (err) {
    console.error('Invalid GA4 service account env var:', err);
    return null;
  }
}

/**
 * Returns true if credentials are configured. Used by the admin page to
 * decide whether to render the empty-state warning.
 */
export function getGa4Client(): { ok: true } | null {
  return getCredentials() ? { ok: true } : null;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Mint a Google access token via JWT — direct REST flow, no gRPC.
 * Tokens are cached for 50 minutes.
 */
async function getAccessToken(creds: ServiceAccount): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }
  const jwt = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });
  const { access_token } = await jwt.authorize();
  if (!access_token) throw new Error('No access token returned by JWT.authorize()');
  cachedToken = { token: access_token, expiresAt: now + 50 * 60 * 1000 };
  return access_token;
}

interface RunReportRequest {
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  dateRanges: { startDate: string; endDate: string }[];
  orderBys?: Array<
    | { metric: { metricName: string }; desc?: boolean }
    | { dimension: { dimensionName: string }; desc?: boolean }
  >;
  limit?: number;
}

interface RunReportRow {
  dimensionValues?: { value: string }[];
  metricValues?: { value: string }[];
}

interface RunReportResponse {
  rows?: RunReportRow[];
  rowCount?: number;
}

async function runReport(
  creds: ServiceAccount,
  body: RunReportRequest,
): Promise<RunReportResponse> {
  const token = await getAccessToken(creds);
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GA4 runReport ${res.status}: ${text.slice(0, 500)}`);
  }
  return res.json() as Promise<RunReportResponse>;
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
 * Pull a full dashboard snapshot. Six parallel runReport calls — each
 * tiny, all reuse the same cached access token.
 */
export async function fetchGa4Snapshot(days: number = 7): Promise<Ga4Snapshot> {
  const creds = getCredentials();
  if (!creds) return empty;
  const dateRange = { startDate: `${days}daysAgo`, endDate: 'today' };

  try {
    const [totalsR, pagesR, countriesR, sourcesR, devicesR, dailyR] = await Promise.all([
      runReport(creds, {
        metrics: [
          { name: 'activeUsers' },
          { name: 'newUsers' },
          { name: 'sessions' },
          { name: 'averageSessionDuration' },
        ],
        dateRanges: [dateRange],
      }),
      runReport(creds, {
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        dateRanges: [dateRange],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 8,
      }),
      runReport(creds, {
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        dateRanges: [dateRange],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8,
      }),
      runReport(creds, {
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'activeUsers' }],
        dateRanges: [dateRange],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 8,
      }),
      runReport(creds, {
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        dateRanges: [dateRange],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),
      runReport(creds, {
        dimensions: [{ name: 'date' }],
        metrics: [{ name: 'activeUsers' }],
        dateRanges: [dateRange],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    ]);

    const t0 = totalsR.rows?.[0]?.metricValues || [];
    const totals = {
      activeUsers: Number(t0[0]?.value || 0),
      newUsers: Number(t0[1]?.value || 0),
      sessions: Number(t0[2]?.value || 0),
      avgSessionDurationSec: Number(t0[3]?.value || 0),
    };
    const topPages = (pagesR.rows || []).map((r) => ({
      path: r.dimensionValues?.[0]?.value || '',
      views: Number(r.metricValues?.[0]?.value || 0),
    }));
    const topCountries = (countriesR.rows || []).map((r) => ({
      country: r.dimensionValues?.[0]?.value || '',
      users: Number(r.metricValues?.[0]?.value || 0),
    }));
    const topSources = (sourcesR.rows || []).map((r) => ({
      source: r.dimensionValues?.[0]?.value || '',
      users: Number(r.metricValues?.[0]?.value || 0),
    }));
    const devices = (devicesR.rows || []).map((r) => ({
      device: r.dimensionValues?.[0]?.value || '',
      users: Number(r.metricValues?.[0]?.value || 0),
    }));
    const ratePerDay = (dailyR.rows || []).map((r) => ({
      date: r.dimensionValues?.[0]?.value || '',
      users: Number(r.metricValues?.[0]?.value || 0),
    }));

    return { totals, topPages, topCountries, topSources, devices, ratePerDay };
  } catch (err) {
    const e = err as { message?: string };
    console.error('GA4 fetch failed:', e.message);
    return empty;
  }
}
