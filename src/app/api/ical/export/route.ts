import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface BookingRow {
  id: string;
  check_in: string;
  check_out: string;
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
      .select('id, check_in, check_out, guest_name')
      .eq('status', 'confirmed');

    if (error) {
      return NextResponse.json({ error: 'Failed to load bookings', details: error.message }, { status: 500 });
    }

    const bookings: BookingRow[] = (data || []) as BookingRow[];
    const dtstamp = formatDtStamp(new Date());

    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//Villa Solria//EN');
    lines.push('CALSCALE:GREGORIAN');
    lines.push('METHOD:PUBLISH');
    lines.push('X-WR-CALNAME:Villa Solria Bookings');

    for (const b of bookings) {
      if (!b.check_in || !b.check_out) continue;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:booking-${b.id}@villasolria.com`);
      lines.push(`DTSTAMP:${dtstamp}`);
      lines.push(`DTSTART;VALUE=DATE:${toICalDate(b.check_in)}`);
      lines.push(`DTEND;VALUE=DATE:${toICalDate(b.check_out)}`);
      lines.push('SUMMARY:Booked');
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:OPAQUE');
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
