import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabase = createServerClient();

    // Fetch all non-cancelled bookings
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('id, total_price, status, payment_status, created_at, checkin_date, num_nights, source')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const all = bookings || [];
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // All-time stats
    const paid = all.filter((b) => b.payment_status === 'paid');
    const pending = all.filter((b) => b.payment_status === 'pending');
    const totalRevenue = paid.reduce((s, b) => s + (b.total_price || 0), 0);
    const avgBookingValue = paid.length > 0 ? totalRevenue / paid.length : 0;
    const avgNights = paid.length > 0 ? paid.reduce((s, b) => s + (b.num_nights || 0), 0) / paid.length : 0;

    // Revenue is recognized when the stay actually happens (checkin
    // month), not when the booking row was created — otherwise booking
    // a Sept stay in April would inflate April's revenue.
    const thisMonthBookings = all.filter((b) => b.checkin_date?.startsWith(thisMonth));
    const thisMonthPaid = thisMonthBookings.filter((b) => b.payment_status === 'paid');
    const thisMonthRevenue = thisMonthPaid.reduce((s, b) => s + (b.total_price || 0), 0);
    const thisMonthPending = thisMonthBookings.filter((b) => b.payment_status === 'pending');
    const thisMonthPendingRevenue = thisMonthPending.reduce((s, b) => s + (b.total_price || 0), 0);

    // Last month
    const lastMonthBookings = all.filter((b) => b.checkin_date?.startsWith(lastMonthStr));
    const lastMonthPaid = lastMonthBookings.filter((b) => b.payment_status === 'paid');
    const lastMonthRevenue = lastMonthPaid.reduce((s, b) => s + (b.total_price || 0), 0);

    // Conversion rate (paid vs total non-cancelled)
    const conversionRate = all.length > 0 ? (paid.length / all.length) * 100 : 0;

    // Revenue growth
    const revenueGrowth = lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : thisMonthRevenue > 0 ? 100 : 0;

    // Source breakdown
    const sources: Record<string, { count: number; revenue: number }> = {};
    for (const b of paid) {
      const src = b.source || 'unknown';
      if (!sources[src]) sources[src] = { count: 0, revenue: 0 };
      sources[src].count += 1;
      sources[src].revenue += b.total_price || 0;
    }

    // Monthly revenue (last 6 months)
    const monthlyRevenue: { month: string; revenue: number; bookings: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthPaid = all.filter(
        (b) => b.checkin_date?.startsWith(key) && b.payment_status === 'paid'
      );
      monthlyRevenue.push({
        month: key,
        revenue: monthPaid.reduce((s, b) => s + (b.total_price || 0), 0),
        bookings: monthPaid.length,
      });
    }

    // Recent transactions (last 10)
    const recentTransactions = all.slice(0, 10).map((b) => ({
      id: b.id,
      total_price: b.total_price,
      status: b.status,
      payment_status: b.payment_status,
      created_at: b.created_at,
      checkin_date: b.checkin_date,
      source: b.source,
    }));

    // Upcoming revenue (confirmed future bookings)
    const today = now.toISOString().slice(0, 10);
    const upcomingRevenue = paid
      .filter((b) => b.checkin_date && b.checkin_date >= today)
      .reduce((s, b) => s + (b.total_price || 0), 0);

    return NextResponse.json({
      overview: {
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        pendingRevenue: thisMonthPendingRevenue,
        upcomingRevenue,
        avgBookingValue: Math.round(avgBookingValue),
        avgNights: Math.round(avgNights * 10) / 10,
        conversionRate: Math.round(conversionRate * 10) / 10,
        totalBookings: all.length,
        paidBookings: paid.length,
        pendingBookings: pending.length,
      },
      monthlyRevenue,
      sources,
      recentTransactions,
    });
  } catch (err) {
    console.error('Payment stats error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
