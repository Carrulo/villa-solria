import { NextRequest, NextResponse } from 'next/server';
import { getStripeFromSettings } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';
import { generateBookingReference, sendBookingConfirmationEmail, sendAbandonmentEmail } from '@/lib/email';
import { sendTelegramNotification, buildNewBookingMessage, buildCancellationMessage } from '@/lib/telegram';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30; // Allow up to 30s for email + telegram

// Stripe sends raw body — we must NOT parse it as JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const stripeClient = await getStripeFromSettings();

    // Read webhook secret from settings or env
    const supabaseInit = createServerClient();
    const { data: whData } = await supabaseInit
      .from('settings')
      .select('value')
      .eq('key', 'stripe_webhook_secret')
      .single();
    const webhookSecret = (whData?.value as string) || process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;
    try {
      event = stripeClient.webhooks.constructEvent(body, sig, webhookSecret);
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

          // Generate booking reference
          let reference: string;
          try {
            reference = await generateBookingReference();
            // Try to store reference in the booking row
            const { error: refError } = await supabase
              .from('bookings')
              .update({ reference })
              .eq('id', bookingId);

            if (refError) {
              // Column might not exist — use booking ID prefix as fallback
              console.warn('Could not save reference (column may not exist):', refError.message);
              reference = bookingId.slice(0, 8).toUpperCase();
            }
          } catch {
            reference = bookingId.slice(0, 8).toUpperCase();
          }

          // Fetch full booking data for email + date blocking
          const { data: booking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .single();

          if (booking) {
            // Block dates in blocked_dates table
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

            // Create cleaning task for checkout date (internal ledger).
            // Snapshot the current base fee from settings so price edits
            // don't rewrite history.
            try {
              const { data: feeRow } = await supabase
                .from('settings')
                .select('value')
                .eq('key', 'cleaning_base_fee')
                .maybeSingle();
              const baseFee = Number(feeRow?.value ?? 50) || 50;

              await supabase.from('cleaning_tasks').upsert(
                {
                  booking_id: bookingId,
                  cleaning_date: booking.checkout_date,
                  guest_name: booking.guest_name || null,
                  num_guests: booking.num_guests ?? null,
                  cleaning_fee_snapshot: baseFee,
                  laundry_fee_snapshot: 0,
                  rooms_with_laundry: 0,
                },
                { onConflict: 'booking_id' }
              );
            } catch (err) {
              console.error('Failed to create cleaning_task for booking:', err);
            }

            // Send email + Telegram in PARALLEL to avoid timeout
            const emailData = {
              reference,
              guest_name: booking.guest_name || '',
              guest_email: booking.guest_email || '',
              checkin_date: booking.checkin_date,
              checkout_date: booking.checkout_date,
              num_nights: booking.num_nights || 1,
              num_guests: booking.num_guests || 1,
              total_price: booking.total_price || 0,
              language: booking.language || 'pt',
              stripe_receipt_url: null as string | null,
            };

            const telegramData = {
              reference,
              guest_name: booking.guest_name || '',
              guest_email: booking.guest_email || '',
              guest_phone: booking.guest_phone,
              checkin_date: booking.checkin_date,
              checkout_date: booking.checkout_date,
              num_nights: booking.num_nights || 1,
              num_guests: booking.num_guests || 1,
              total_price: booking.total_price || 0,
            };

            await Promise.allSettled([
              sendBookingConfirmationEmail(emailData).catch((e) =>
                console.error('Email failed:', e)
              ),
              sendTelegramNotification(buildNewBookingMessage(telegramData)).catch((e) =>
                console.error('Telegram failed:', e)
              ),
            ]);
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.metadata?.booking_id;

        if (bookingId) {
          // Fetch booking details before cancelling — needed for abandonment email
          const { data: expiredBooking } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', bookingId)
            .eq('status', 'pending')
            .single();

          // Send abandonment email (non-blocking — cancellation proceeds regardless)
          if (expiredBooking?.guest_email) {
            try {
              await sendAbandonmentEmail({
                guest_name: expiredBooking.guest_name || '',
                guest_email: expiredBooking.guest_email,
                checkin_date: expiredBooking.checkin_date,
                checkout_date: expiredBooking.checkout_date,
                num_nights: expiredBooking.num_nights || 1,
                total_price: expiredBooking.total_price || 0,
                language: expiredBooking.language || 'pt',
              });
            } catch (emailErr) {
              console.error('Failed to send abandonment email:', emailErr);
            }
          }

          // Cancel the pending booking since payment expired
          await supabase
            .from('bookings')
            .update({ status: 'cancelled' })
            .eq('id', bookingId)
            .eq('status', 'pending');

          console.log(`Booking ${bookingId} cancelled (session expired)`);

          // Telegram notification
          if (expiredBooking) {
            try {
              await sendTelegramNotification(buildCancellationMessage({
                reference: expiredBooking.reference || bookingId.slice(0, 8).toUpperCase(),
                guest_name: expiredBooking.guest_name || '',
                checkin_date: expiredBooking.checkin_date,
                checkout_date: expiredBooking.checkout_date,
                total_price: expiredBooking.total_price || 0,
              }));
            } catch {
              // non-critical
            }
          }
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
