import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendPreArrivalEmail } from '@/lib/email';

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
  guide_token: string | null;
  door_code: string | null;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function todayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const testEmail = url.searchParams.get('test_email');
  const testLang = url.searchParams.get('lang') || 'pt';
  const testName = url.searchParams.get('name') || 'Teste';

  if (testEmail) {
    const sent = await sendPreArrivalEmail({
      guest_name: testName,
      guest_email: testEmail,
      checkin_date: addDays(todayIso(), 1),
      checkout_date: addDays(todayIso(), 8),
      guide_token: 'test1234deadbeef00001111',
      language: testLang,
    });
    return NextResponse.json({ test: true, to: testEmail, ...sent }, { headers: { 'Cache-Control': 'no-store' } });
  }

  const supabase = createServerClient();
  const target = addDays(todayIso(), 1);

  // checkin exactly tomorrow, and not already in the past (belt + braces —
  // the equality on `target` already guarantees this, but explicit keeps
  // the intent obvious if the window ever widens).
  const { data, error } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_email, checkin_date, checkout_date, language, status, source, guide_token, door_code')
    .eq('checkin_date', target)
    .gte('checkin_date', todayIso())
    .in('source', ['website', 'manual'])
    .eq('status', 'confirmed')
    .is('pre_arrival_sent_at', null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data || []) as BookingRow[];
  const results: { id: string; email: string | null; ok: boolean; err?: string }[] = [];

  for (const b of rows) {
    if (!b.guest_email) {
      results.push({ id: b.id, email: null, ok: false, err: 'no email' });
      continue;
    }
    if (!b.guide_token) {
      results.push({ id: b.id, email: b.guest_email, ok: false, err: 'no guide_token' });
      continue;
    }
    // Safety gate: block the send if the per-booking door code wasn't set.
    // Create a notification so the admin is pinged to fill it in, and retry
    // on the next cron run.
    if (!b.door_code || !b.door_code.trim()) {
      await supabase.from('notifications').insert({
        type: 'door_code_missing',
        title: `Falta código da fechadura — ${b.guest_name || 'reserva'}`,
        body: `Check-in amanhã (${b.checkin_date}). Defina o código novo antes do pre-arrival sair.`,
        link: '/admin/pre-arrivals',
      });
      results.push({ id: b.id, email: b.guest_email, ok: false, err: 'door_code missing' });
      continue;
    }
    const sent = await sendPreArrivalEmail({
      guest_name: b.guest_name || '',
      guest_email: b.guest_email,
      checkin_date: b.checkin_date,
      checkout_date: b.checkout_date,
      guide_token: b.guide_token,
      language: b.language || 'pt',
    });
    if (sent.success) {
      await supabase
        .from('bookings')
        .update({ pre_arrival_sent_at: new Date().toISOString() })
        .eq('id', b.id);
    }
    results.push({ id: b.id, email: b.guest_email, ok: sent.success, err: sent.error });
  }

  return NextResponse.json(
    { success: true, checkin_date: target, processed: results.length, results },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
