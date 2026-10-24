import { NextRequest, NextResponse } from 'next/server';
import { getStripeFromSettings } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Returns a pet booking's damage deposit: a partial Stripe refund of
 * exactly bookings.pet_deposit. The deposit is charged with the booking
 * because Stripe cannot hold an authorisation for a multi-week stay
 * (see migration 023). Refunds are possible up to 180 days after payment.
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const { bookingId } = await request.json().catch(() => ({}));
  if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });

  const supabase = createServerClient();
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', bookingId).maybeSingle();
  if (!booking) return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });

  const deposit = Number(booking.pet_deposit) || 0;
  if (deposit <= 0) return NextResponse.json({ error: 'Esta reserva não tem caução' }, { status: 400 });
  if (booking.pet_deposit_refunded_at) {
    return NextResponse.json({ error: 'A caução já foi devolvida' }, { status: 400 });
  }
  if (booking.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Reserva não está paga' }, { status: 400 });
  }

  const stripe = await getStripeFromSettings();
  let paymentIntentId: string | null = booking.stripe_payment_intent;
  if (!paymentIntentId && booking.stripe_session_id) {
    const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
    paymentIntentId =
      typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null;
  }
  if (!paymentIntentId) {
    return NextResponse.json({ error: 'Pagamento não encontrado no Stripe' }, { status: 400 });
  }

  // Claim first so a double click cannot refund twice.
  const { data: claimed } = await supabase
    .from('bookings')
    .update({ pet_deposit_refunded_at: new Date().toISOString() })
    .eq('id', bookingId)
    .is('pet_deposit_refunded_at', null)
    .select('id');
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ error: 'A caução já foi devolvida' }, { status: 400 });
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(deposit * 100),
      metadata: { booking_id: bookingId, reason: 'pet_deposit' },
    });
    return NextResponse.json({ ok: true, amount: refund.amount / 100 });
  } catch (err) {
    await supabase.from('bookings').update({ pet_deposit_refunded_at: null }).eq('id', bookingId);
    const message = err instanceof Error ? err.message : 'Erro no Stripe';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
