import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendPreArrivalEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: { booking_id?: string };
  try {
    body = (await req.json()) as { booking_id?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.booking_id) {
    return NextResponse.json({ error: 'booking_id required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: b, error } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_email, checkin_date, checkout_date, language, guide_token, door_code')
    .eq('id', body.booking_id)
    .single();

  if (error || !b) return NextResponse.json({ error: error?.message || 'not found' }, { status: 404 });
  if (!b.guest_email) return NextResponse.json({ error: 'booking has no guest_email' }, { status: 400 });
  if (!b.guide_token) return NextResponse.json({ error: 'booking has no guide_token' }, { status: 400 });
  if (!b.door_code || !b.door_code.trim()) {
    return NextResponse.json({ error: 'Defina o código da fechadura na reserva antes de enviar.' }, { status: 400 });
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
    await supabase.from('bookings').update({ pre_arrival_sent_at: new Date().toISOString() }).eq('id', b.id);
  }
  return NextResponse.json(sent, { headers: { 'Cache-Control': 'no-store' } });
}
