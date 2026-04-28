import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface BookingRow {
  id: string;
  checkin_date: string;
  checkout_date: string;
  guest_name: string | null;
}

function toICalDate(date: string): string {
  // date is YYYY-MM-DD → YYYYMMDD
  return date.replace(/-/g, '');
}

function formatDtStamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('bookings')
      .select('id, checkin_date, checkout_date, guest_name')
      .eq('status', 'confirmed');

    if (error) {
      return NextResponse.json({ error: 'Failed to load bookings', details: error.message }, { status: 500 });
    }

    const bookings: BookingRow[] = (data || []) as BookingRow[];
    const dtstamp = formatDtStamp(new Date());

    // Minimal payload that mirrors Airbnb's iCal export — VRBO/HomeAway
    // rejects feeds with extra headers (METHOD, X-WR-CALNAME, STATUS,
    // TRANSP) with a generic "something went wrong" error. Only PRODID,
    // VERSION, CALSCALE plus VEVENT(UID, DTSTAMP, DTSTART, DTEND,
    // SUMMARY) are kept.
    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('PRODID:-//Villa Solria//Hosting Calendar 1.0//EN');
    lines.push('VERSION:2.0');
    lines.push('CALSCALE:GREGORIAN');

    for (const b of bookings) {
      if (!b.checkin_date || !b.checkout_date) continue;
      lines.push('BEGIN:VEVENT');
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`UID:${b.id}@villasolria.com`);
      lines.push(`DTSTART;VALUE=DATE:${toICalDate(b.checkin_date)}`);
      lines.push(`DTEND;VALUE=DATE:${toICalDate(b.checkout_date)}`);
      lines.push('SUMMARY:Reserved');
      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    const body = lines.join('\r\n') + '\r\n';

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="villa-solria.ics"',
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'Internal server error', details: message }, { status: 500 });
  }
}
