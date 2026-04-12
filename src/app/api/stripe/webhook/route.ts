import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Stripe sends raw body — we must NOT parse it as JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = getStripe().webhooks.constructEvent(
        body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      console.error('Webhook signature verification failed:', message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = createServerClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (!bookingId) {
          console.warn('checkout.session.completed without booking_id metadata');
          break;
        }

        // Mark booking as confirmed + paid
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            payment_status: 'paid',
            stripe_session_id: session.id,
            stripe_payment_intent:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id || null,
          })
          .eq('id', bookingId);

        if (updateError) {
          console.error('Failed to update booking after payment:', updateError);
        } else {
          console.log(`Booking ${bookingId} confirmed + paid`);

          // Block dates in blocked_dates table
          const { data: booking } = await supabase
            .from('bookings')
            .select('checkin_date, checkout_date, guest_name')
            .eq('id', bookingId)
            .single();

          if (booking) {
            const dates: { date: string; source: string; note: string }[] = [];
            const cur = new Date(booking.checkin_date);
            const end = new Date(booking.checkout_date);
            while (cur < end) {
              dates.push({
                date: cur.toISOString().slice(0, 10),
                source: 'website',
                note: `Reserva: ${booking.guest_name || 'Website'}`,
              });
              cur.setUTCDate(cur.getUTCDate() + 1);
            }

            if (dates.length > 0) {
              await supabase.from('blocked_dates').insert(dates);
            }
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          // Cancel the pending booking since payment expired
          await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId)
            .eq('status', 'pending');

          console.log(`Booking ${bookingId} cancelled (session expired)`);
        }
        break;
      }

      default:
        // Ignore other events
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
