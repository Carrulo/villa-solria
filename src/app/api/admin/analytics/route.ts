import { NextRequest, NextResponse } from 'next/server';
import { fetchGa4Snapshot, getGa4Client } from '@/lib/ga4';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get('days') || '7');
  const days = daysParam === 30 ? 30 : 7;

  const configured = getGa4Client() !== null;
  if (!configured) {
    return NextResponse.json({ configured: false, totals: { activeUsers: 0, newUsers: 0, sessions: 0, avgSessionDurationSec: 0 }, topPages: [], topCountries: [], topSources: [], devices: [], ratePerDay: [] });
  }

  const snapshot = await fetchGa4Snapshot(days);
  return NextResponse.json({ configured: true, ...snapshot });
}
