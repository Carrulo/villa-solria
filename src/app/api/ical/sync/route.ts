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

function parseICalDate(value: string): Date | null {
  // Handles YYYYMMDD (date-only) and YYYYMMDDTHHMMSSZ (date-time)
  const clean = value.trim();
  if (/^\d{8}$/.test(clean)) {
    const y = parseInt(clean.substring(0, 4), 10);
    const m = parseInt(clean.substring(4, 6), 10) - 1;
    const d = parseInt(clean.substring(6, 8), 10);
    return new Date(Date.UTC(y, m, d));
  }
  if (/^\d{8}T\d{6}Z?$/.test(clean)) {
    const y = parseInt(clean.substring(0, 4), 10);
    const mo = parseInt(clean.substring(4, 6), 10) - 1;
    const d = parseInt(clean.substring(6, 8), 10);
    const h = parseInt(clean.substring(9, 11), 10);
    const mi = parseInt(clean.substring(11, 13), 10);
    const s = parseInt(clean.substring(13, 15), 10);
    return new Date(Date.UTC(y, mo, d, h, mi, s));
  }
  return null;
}

function datesInRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  // DTEND in iCal is exclusive
  while (cur < stop) {
    dates.push(formatDate(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

type VEvent = { dtstart?: string; dtend?: string; summary?: string; uid?: string };

// Airbnb iCal mixes real reservations ("Reserved") with availability
// blocks ("Not available", "Airbnb (Not available)"). Booking.com iCal
// is the opposite: every reservation comes through as
// "CLOSED - Not available" (the platform doesn't expose guest names via
// iCal), so for Booking we treat every event as a reservation.
function isReservation(
  summary: string | null | undefined,
  source: 'airbnb_ical' | 'booking_ical'
): boolean {
  if (source === 'booking_ical') return true;
  if (!summary) return false;
  const s = summary.trim().toLowerCase();
  if (s.includes('not available')) return false;
  if (s.startsWith('closed')) return false;
  if (s === 'blocked') return false;
  return true;
}

function parseICS(text: string): VEvent[] {
  // Unfold folded lines (RFC 5545: lines starting with space/tab continue previous line)
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const lines = unfolded.split(/\r\n|\n|\r/);

  const events: VEvent[] = [];
  let current: VEvent | null = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current) events.push(current);
      current = null;
    } else if (current) {
      // Match PROPERTY[;PARAMS]:VALUE
      const colonIdx = line.indexOf(':');
      if (colonIdx < 0) continue;
      const left = line.substring(0, colonIdx);
      const value = line.substring(colonIdx + 1);
      const propName = left.split(';')[0].toUpperCase();
      if (propName === 'DTSTART') current.dtstart = value;
      else if (propName === 'DTEND') current.dtend = value;
      else if (propName === 'SUMMARY') current.summary = value;
      else if (propName === 'UID') current.uid = value;
    }
  }

  return events;
}

async function syncSource(
  supabase: ReturnType<typeof createServerClient>,
  url: string,
  source: 'airbnb_ical' | 'booking_ical',
  baseCleaningFee: number
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
    const events = parseICS(text);

    const blockedRows: { date: string; source: string; note: string | null }[] = [];
    let eventCount = 0;

    type CleaningRow = {
      external_source: 'airbnb_ical' | 'booking_ical';
      external_ref: string;
      cleaning_date: string;
      checkin_date: string;
      stay_checkout_date: string;
      guest_name: string | null;
      num_guests: null;
      cleaning_fee_snapshot: number;
      laundry_fee_snapshot: number;
      rooms_with_laundry: number;
    };
    const cleaningRows: CleaningRow[] = [];
    const seenRefs = new Set<string>();

    for (const event of events) {
      if (!event.dtstart || !event.dtend) continue;
      const startDate = parseICalDate(event.dtstart);
      const endDate = parseICalDate(event.dtend);
      if (!startDate || !endDate) continue;
      eventCount += 1;

      const note = event.summary || null;
      for (const date of datesInRange(startDate, endDate)) {
        blockedRows.push({ date, source, note });
      }

      // Skip availability blocks — they block the calendar but are not
      // real reservations, so no cleaning task / "booking" entry.
      if (!isReservation(event.summary, source)) continue;

      // One cleaning task per external reservation, on its DTSTART (the
      // arrival day — the cleaner preps the villa before the guest gets
      // in). DTEND is kept as stay_checkout_date for the stay range and
      // same-day turn detection.
      // Stable ref per platform — prefer UID, fall back to DTSTART.
      const ref = (event.uid || formatDate(startDate)).slice(0, 200);
      const cleaningDate = formatDate(startDate);
      const stayCheckout = formatDate(endDate);
      const dedupeKey = `${ref}|${cleaningDate}`;
      if (!seenRefs.has(dedupeKey)) {
        seenRefs.add(dedupeKey);
        cleaningRows.push({
          external_source: source,
          external_ref: ref,
          cleaning_date: cleaningDate,
          checkin_date: cleaningDate,
          stay_checkout_date: stayCheckout,
          guest_name: note,
          num_guests: null,
          cleaning_fee_snapshot: baseCleaningFee,
          laundry_fee_snapshot: 0,
          rooms_with_laundry: 0,
        });
      }
    }

    // Full refresh of blocked_dates for this source
    const { error: delError } = await supabase.from('blocked_dates').delete().eq('source', source);
    if (delError) {
      return { events: eventCount, dates_blocked: 0, error: `delete failed: ${delError.message}` };
    }

    // Dedupe by date
    const uniqueByDate = new Map<string, { date: string; source: string; note: string | null }>();
    for (const row of blockedRows) {
      if (!uniqueByDate.has(row.date)) uniqueByDate.set(row.date, row);
    }
    const rowsToInsert = Array.from(uniqueByDate.values());

    if (rowsToInsert.length > 0) {
      const { error: insError } = await supabase.from('blocked_dates').insert(rowsToInsert);
      if (insError) {
        return { events: eventCount, dates_blocked: 0, error: `insert failed: ${insError.message}` };
      }
    }

    // Sync cleaning_tasks for this external source.
    // Keep paid tasks (historical ledger). Remove unpaid tasks whose
    // reservation no longer exists in the feed.
    try {
      const { data: existingRows } = await supabase
        .from('cleaning_tasks')
        .select('external_ref, cleaning_date, cleaning_paid, laundry_paid')
        .eq('external_source', source);

      const currentKeys = new Set(cleaningRows.map((r) => `${r.external_ref}|${r.cleaning_date}`));
      const toDelete = (existingRows || [])
        .filter(
          (r: { external_ref: string | null; cleaning_date: string; cleaning_paid: boolean; laundry_paid: boolean }) =>
            r.external_ref &&
            !r.cleaning_paid &&
            !r.laundry_paid &&
            !currentKeys.has(`${r.external_ref}|${r.cleaning_date}`)
        )
        .map((r: { external_ref: string | null; cleaning_date: string }) => ({
          external_ref: r.external_ref!,
          cleaning_date: r.cleaning_date,
        }));

      for (const row of toDelete) {
        await supabase
          .from('cleaning_tasks')
          .delete()
          .eq('external_source', source)
          .eq('external_ref', row.external_ref)
          .eq('cleaning_date', row.cleaning_date);
      }

      if (cleaningRows.length > 0) {
        // ignoreDuplicates: true → only insert new rows, leave existing
        // ones untouched. This preserves admin-edited guest_name and
        // team-entered rooms_with_laundry between syncs.
        await supabase
          .from('cleaning_tasks')
          .upsert(cleaningRows, {
            onConflict: 'external_source,external_ref,cleaning_date',
            ignoreDuplicates: true,
          });

        // Backfill stay_checkout_date on existing rows that predate the column.
        for (const row of cleaningRows) {
          await supabase
            .from('cleaning_tasks')
            .update({ stay_checkout_date: row.stay_checkout_date })
            .eq('external_source', row.external_source)
            .eq('external_ref', row.external_ref)
            .eq('cleaning_date', row.cleaning_date)
            .is('stay_checkout_date', null);
        }
      }
    } catch (err) {
      console.error('[ical-sync] cleaning_tasks sync failed:', err);
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
      .in('key', ['ical_airbnb', 'ical_booking', 'cleaning_base_fee']);

    if (settingsError) {
      return NextResponse.json({ error: 'Failed to read settings', details: settingsError.message }, { status: 500 });
    }

    const settings: Record<string, string> = {};
    (settingsRows || []).forEach((row: { key: string; value: unknown }) => {
      settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    });

    const baseCleaningFee = Number(settings.cleaning_base_fee ?? 50) || 50;

    const result: { airbnb: SyncResult; booking: SyncResult } = {
      airbnb: { events: 0, dates_blocked: 0 },
      booking: { events: 0, dates_blocked: 0 },
    };

    const airbnbUrl = (settings.ical_airbnb || '').trim();
    if (airbnbUrl) {
      result.airbnb = await syncSource(supabase, airbnbUrl, 'airbnb_ical', baseCleaningFee);
    }

    const bookingUrl = (settings.ical_booking || '').trim();
    if (bookingUrl) {
      result.booking = await syncSource(supabase, bookingUrl, 'booking_ical', baseCleaningFee);
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
