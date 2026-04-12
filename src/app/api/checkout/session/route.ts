import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, locale = 'pt' } = body;

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
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status === 'confirmed' && booking.payment_status === 'paid') {
      return NextResponse.json({ error: 'Booking already paid' }, { status: 400 });
    }

    const nights = booking.num_nights || 1;
    const pricePerNight = booking.price_per_night || 100;
    const cleaningFee = booking.cleaning_fee || 0;
    const discount = booking.discount || 0;

    // Build line items
    const lineItems: {
      price_data: {
        currency: string;
        product_data: { name: string; description?: string };
        unit_amount: number;
      };
      quantity: number;
    }[] = [];

    // Accommodation
    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Villa Solria — Estadia',
          description: `${nights} noite${nights > 1 ? 's' : ''} (${booking.checkin_date} → ${booking.checkout_date})`,
        },
        unit_amount: Math.round(pricePerNight * 100), // cents
      },
      quantity: nights,
    });

    // Cleaning fee
    if (cleaningFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: 'Taxa de limpeza' },
          unit_amount: Math.round(cleaningFee * 100),
        },
        quantity: 1,
      });
    }

    // Build discounts (use Stripe coupon if applicable)
    const discounts: { coupon: string }[] = [];
    if (discount > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: discount,
        duration: 'once',
        name: `Desconto estadia longa (${discount}%)`,
      });
      discounts.push({ coupon: coupon.id });
    }

    // Determine base URL
    const origin = request.headers.get('origin') || 'https://villa-solria.vercel.app';

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      ...(discounts.length > 0 ? { discounts } : {}),
      customer_email: booking.guest_email,
      metadata: {
        booking_id: bookingId,
        checkin_date: booking.checkin_date,
        checkout_date: booking.checkout_date,
      },
      success_url: `${origin}/${locale}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/booking/cancel?booking_id=${bookingId}`,
      expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes from now
      locale: (locale === 'pt' ? 'pt' : locale === 'es' ? 'es' : locale === 'de' ? 'de' : 'en') as 'pt' | 'es' | 'de' | 'en',
    });

    // Save session ID on booking
    await supabase
      .from('bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', bookingId);

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout session error:', err);
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: 'Failed to create checkout session', details: message }, { status: 500 });
  }
}
