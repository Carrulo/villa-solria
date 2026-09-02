import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Today in YYYY-MM-DD (UTC)
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    const d = String(now.getUTCDate()).padStart(2, '0');
    const today = `${y}-${m}-${d}`;

    const [{ data, error }, { data: horizonRow }] = await Promise.all([
      supabase
        .from('blocked_dates')
        .select('date, source, note')
        .gte('date', today)
        .order('date', { ascending: true }),
      // How far ahead we sell. Peak months are deliberately held back
      // until next season's prices are set, the same way the calendar is
      // kept closed on Booking/Airbnb/VRBO.
      supabase.from('settings').select('value').eq('key', 'booking_open_until').maybeSingle(),
    ]);

    if (error) {
      console.error('blocked-dates fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch blocked dates' }, { status: 500 });
    }

    const raw = horizonRow?.value;
    const openUntil =
      typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? raw.trim() : null;

    return NextResponse.json({ dates: data || [], openUntil }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('blocked-dates API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
