import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendReviewRequestEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

interface BookingRow {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  checkin_date: string;
  checkout_date: string;
  language: string | null;
  status: string | null;
  source: string | null;
}

function isoDateDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const supabase = createServerClient();

  const target = isoDateDaysAgo(2);

  const { data, error } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_email, checkin_date, checkout_date, language, status, source')
    .eq('checkout_date', target)
    .in('source', ['website', 'manual'])
    .eq('status', 'confirmed')
    .is('review_requested_at', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as BookingRow[];
  const results: { id: string; email: string | null; ok: boolean; err?: string }[] = [];

  for (const b of rows) {
    if (!b.guest_email) {
      results.push({ id: b.id, email: null, ok: false, err: 'no email' });
      continue;
    }
    const sent = await sendReviewRequestEmail({
      guest_name: b.guest_name || '',
      guest_email: b.guest_email,
      checkin_date: b.checkin_date,
      checkout_date: b.checkout_date,
      language: b.language || 'pt',
    });
    if (sent.success) {
      await supabase
        .from('bookings')
        .update({ review_requested_at: new Date().toISOString() })
        .eq('id', b.id);
    }
    results.push({ id: b.id, email: b.guest_email, ok: sent.success, err: sent.error });
  }

  return NextResponse.json(
    { success: true, checkout_date: target, processed: results.length, results },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
