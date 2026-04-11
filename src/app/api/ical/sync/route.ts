import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

type SyncResult = { events: number; dates_blocked: number; error?: string };

function formatDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function datesInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  // Use UTC to avoid TZ drift. iCal VALUE=DATE events are date-only.
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  // DTEND in iCal is exclusive — don't include the end date itself
  while (cur < stop) {
    dates.push(formatDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

async function syncSource(
  supabase: ReturnType<typeof createServerClient>,
  url: string,
  source: 'airbnb_ical' | 'booking_ical'
): Promise<SyncResult> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'VillaSolria-iCalSync/1.0' },
      cache: 'no-store',
    });
    if (!res.ok) {
      return { events: 0, dates_blocked: 0, error: `HTTP ${res.status}` };
    }
    const text = await res.text();
    const icalMod = await import('node-ical');
    const parsed = icalMod.sync.parseICS(text);

    const blockedRows: { date: string; source: string; note: string | null }[] = [];
    let eventCount = 0;

    for (const key of Object.keys(parsed)) {
      const event = parsed[key];
      if (!event || event.type !== 'VEVENT') continue;
      if (!event.start || !event.end) continue;
      eventCount += 1;

      const startDate = event.start instanceof Date ? event.start : new Date(event.start as unknown as string);
      const endDate = event.end instanceof Date ? event.end : new Date(event.end as unknown as string);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue;

      const note = (event.summary as string | undefined) || null;
      for (const date of datesInRange(startDate, endDate)) {
        blockedRows.push({ date, source, note });
      }
    }

    // Full refresh: delete existing for this source
    const { error: delError } = await supabase.from('blocked_dates').delete().eq('source', source);
    if (delError) {
      return { events: eventCount, dates_blocked: 0, error: `delete failed: ${delError.message}` };
    }

    // Deduplicate by date (iCal feeds can have overlapping events)
    const uniqueByDate = new Map<string, { date: string; source: string; note: string | null }>();
    for (const row of blockedRows) {
      if (!uniqueByDate.has(row.date)) uniqueByDate.set(row.date, row);
    }
    const rowsToInsert = Array.from(uniqueByDate.values());

    if (rowsToInsert.length === 0) {
      return { events: eventCount, dates_blocked: 0 };
    }

    const { error: insError } = await supabase.from('blocked_dates').insert(rowsToInsert);
    if (insError) {
      return { events: eventCount, dates_blocked: 0, error: `insert failed: ${insError.message}` };
    }

    return { events: eventCount, dates_blocked: rowsToInsert.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return { events: 0, dates_blocked: 0, error: message };
  }
}

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: settingsRows, error: settingsError } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['ical_airbnb', 'ical_booking']);

    if (settingsError) {
      return NextResponse.json({ error: 'Failed to read settings', details: settingsError.message }, { status: 500 });
    }

    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((row: { key: string; value: unknown }) => {
      settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    });

    const result: { airbnb: SyncResult; booking: SyncResult } = {
      airbnb: { events: 0, dates_blocked: 0 },
      booking: { events: 0, dates_blocked: 0 },
    };

    const airbnbUrl = (settings.ical_airbnb || '').trim();
    if (airbnbUrl) {
      result.airbnb = await syncSource(supabase, airbnbUrl, 'airbnb_ical');
    }

    const bookingUrl = (settings.ical_booking || '').trim();
    if (bookingUrl) {
      result.booking = await syncSource(supabase, bookingUrl, 'booking_ical');
    }

    return NextResponse.json(
      { success: true, synced_at: new Date().toISOString(), ...result },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
// Force redeploy Sat Apr 11 21:24:17 WEST 2026
