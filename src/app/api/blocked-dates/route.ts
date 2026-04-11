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

    const { data, error } = await supabase
      .from('blocked_dates')
      .select('date, source, note')
      .gte('date', today)
      .order('date', { ascending: true });

    if (error) {
      console.error('blocked-dates fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch blocked dates' }, { status: 500 });
    }

    return NextResponse.json(data || [], {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('blocked-dates API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
