import { NextRequest, NextResponse } from 'next/server';
import { getStripeFromSettings } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';
import { sendTelegramNotification, buildRefundMessage } from '@/lib/telegram';
import { sendRefundEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Fetch booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 });
    }

    if (booking.payment_status === 'refunded') {
      return NextResponse.json({ error: 'Já foi reembolsado' }, { status: 400 });
    }

    if (booking.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Reserva não está paga — não é possível reembolsar' }, { status: 400 });
    }

    // Get payment intent from booking or Stripe session
    let paymentIntentId = booking.stripe_payment_intent;

    if (!paymentIntentId && booking.stripe_session_id) {
      // Retrieve from Stripe session
      const stripe = await getStripeFromSettings();
      const session = await stripe.checkout.sessions.retrieve(booking.stripe_session_id);
      paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null;
    }

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'Não foi encontrado o pagamento no Stripe para esta reserva' },
        { status: 400 }
      );
    }

    // Issue full refund via Stripe
    const stripe = await getStripeFromSettings();
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    });

    // Update booking status
    await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: 'refunded',
      })
      .eq('id', bookingId);

    // Remove blocked dates for this booking
    const dates: string[] = [];
    const cur = new Date(booking.checkin_date);
    const end = new Date(booking.checkout_date);
    while (cur < end) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    if (dates.length > 0) {
      await supabase
        .from('blocked_dates')
        .delete()
        .eq('source', 'website')
        .in('date', dates);
    }

    // Send refund email + Telegram in parallel
    const ref = booking.reference || bookingId.slice(0, 8).toUpperCase();
    const refundAmount = refund.amount / 100;

    await Promise.allSettled([
      sendRefundEmail({
        reference: ref,
        guest_name: booking.guest_name || '',
        guest_email: booking.guest_email || '',
        checkin_date: booking.checkin_date,
        checkout_date: booking.checkout_date,
        total_price: booking.total_price || 0,
        refund_amount: refundAmount,
        language: booking.language || 'pt',
      }).catch((e) => console.error('Refund email failed:', e)),
      sendTelegramNotification(buildRefundMessage(
        {
          reference: ref,
          guest_name: booking.guest_name || '',
          checkin_date: booking.checkin_date,
          checkout_date: booking.checkout_date,
          total_price: booking.total_price || 0,
        },
        refundAmount,
      )).catch(() => {}),
    ]);

    return NextResponse.json({
      success: true,
      refund_id: refund.id,
      amount: refund.amount / 100,
      currency: refund.currency,
    });
  } catch (err) {
    console.error('Refund error:', err);
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
