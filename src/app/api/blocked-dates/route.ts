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

    const [{ data, error }, { data: horizonRow }, { data: stays }] = await Promise.all([
      supabase
        .from('blocked_dates')
        .select('date, source')
        .gte('date', today)
        .order('date', { ascending: true }),
      // How far ahead we sell. Peak months are deliberately held back
      // until next season's prices are set, the same way the calendar is
      // kept closed on Booking/Airbnb/VRBO.
      supabase.from('settings').select('value').eq('key', 'booking_open_until').maybeSingle(),
      // `blocked_dates` alone is not the whole calendar. The Booking feed
      // stops exporting a stay the day it begins, and the sync then deletes
      // its blocked nights while the guest is still in the house — so a
      // stay that is under way shows as free unless we also read
      // `bookings`. Same two sources as findAvailabilityConflict().
      supabase
        .from('bookings')
        .select('checkin_date, checkout_date, source')
        .in('status', ['confirmed', 'pending_payment'])
        .gt('checkout_date', today),
    ]);

    if (error) {
      console.error('blocked-dates fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch blocked dates' }, { status: 500 });
    }

    const raw = horizonRow?.value;
    const openUntil =
      typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim()) ? raw.trim() : null;

    // Public endpoint: never return `note`, it carries guest names.
    const dates: { date: string; source: string | null }[] = [...(data || [])];
    const seen = new Set(dates.map((b) => b.date));
    for (const stay of stays || []) {
      // Nights are half-open: checkout morning is free for the next guest.
      const cur = new Date(`${stay.checkin_date}T00:00:00Z`);
      const end = new Date(`${stay.checkout_date}T00:00:00Z`);
      for (; cur < end; cur.setUTCDate(cur.getUTCDate() + 1)) {
        const iso = cur.toISOString().slice(0, 10);
        if (iso < today || seen.has(iso)) continue;
        seen.add(iso);
        dates.push({ date: iso, source: stay.source || 'website' });
      }
    }
    dates.sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ dates, openUntil }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('blocked-dates API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
