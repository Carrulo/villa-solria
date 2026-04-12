import { NextRequest, NextResponse } from 'next/server';
import { getStripeFromSettings } from '@/lib/stripe';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ------------------------------------------------------------------ */
/*  i18n translation map for Stripe line items                        */
/* ------------------------------------------------------------------ */

type SupportedLocale = 'pt' | 'en' | 'es' | 'de';

const t: Record<SupportedLocale, {
  accommodation: string;
  nights: (n: number) => string;
  cleaningFee: string;
  longStayDiscount: (pct: number) => string;
  depositNote: (pct: number) => string;
}> = {
  pt: {
    accommodation: 'Villa Solria \u2014 Estadia',
    nights: (n) => `${n} noite${n > 1 ? 's' : ''}`,
    cleaningFee: 'Taxa de limpeza',
    longStayDiscount: (pct) => `Desconto estadia longa (${pct}%)`,
    depositNote: (pct) => `(${pct}% dep\u00f3sito \u2014 restante na chegada)`,
  },
  en: {
    accommodation: 'Villa Solria \u2014 Accommodation',
    nights: (n) => `${n} night${n > 1 ? 's' : ''}`,
    cleaningFee: 'Cleaning fee',
    longStayDiscount: (pct) => `Long stay discount (${pct}%)`,
    depositNote: (pct) => `(${pct}% deposit \u2014 remainder due on arrival)`,
  },
  es: {
    accommodation: 'Villa Solria \u2014 Estancia',
    nights: (n) => `${n} noche${n > 1 ? 's' : ''}`,
    cleaningFee: 'Tasa de limpieza',
    longStayDiscount: (pct) => `Descuento estancia larga (${pct}%)`,
    depositNote: (pct) => `(${pct}% dep\u00f3sito \u2014 resto a la llegada)`,
  },
  de: {
    accommodation: 'Villa Solria \u2014 Unterkunft',
    nights: (n) => `${n} ${n > 1 ? 'N\u00e4chte' : 'Nacht'}`,
    cleaningFee: 'Reinigungsgeb\u00fchr',
    longStayDiscount: (pct) => `Langzeitrabatt (${pct}%)`,
    depositNote: (pct) => `(${pct}% Anzahlung \u2014 Rest bei Anreise)`,
  },
};

function resolveLocale(raw: string): SupportedLocale {
  const key = raw?.toLowerCase() as SupportedLocale;
  return key in t ? key : 'en';
}

/* ------------------------------------------------------------------ */
/*  GET handler — retrieve session details for conversion tracking    */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const stripe = await getStripeFromSettings();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      amount_total: session.amount_total,
      currency: session.currency,
      payment_intent: typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    });
  } catch (err) {
    console.error('Checkout session GET error:', err);
    return NextResponse.json({ error: 'Failed to retrieve session' }, { status: 500 });
  }
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                      */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const stripe = await getStripeFromSettings();

    const body = await request.json();
    const { bookingId, locale: rawLocale = 'pt' } = body;

    if (!bookingId) {
      return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 });
    }

    const locale = resolveLocale(rawLocale);
    const i18n = t[locale];

    const supabase = createServerClient();

    // ---- Fetch settings (deposit_percent, session_timeout_min) ----
    const { data: settingsRows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['deposit_percent', 'session_timeout_min']);

    const settingsMap: Record<string, string> = {};
    for (const row of settingsRows ?? []) {
      settingsMap[row.key] = row.value;
    }

    const depositPercent = Math.max(
      0,
      Math.min(100, Number(settingsMap['deposit_percent']) || 100),
    );
    const sessionTimeoutMin = Math.max(
      5,
      Number(settingsMap['session_timeout_min']) || 30,
    );

    // If deposit_percent is 0, payments are in inquiry mode
    if (depositPercent === 0) {
      return NextResponse.json(
        { error: 'Payments are currently in inquiry mode. Please contact us directly to book.' },
        { status: 400 },
      );
    }

    // ---- Fetch booking ----
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

    const nights: number = booking.num_nights || 1;
    const pricePerNight: number = booking.price_per_night || 100;
    const cleaningFee: number = booking.cleaning_fee || 0;
    const discount: number = booking.discount || 0;

    const isPartialDeposit = depositPercent < 100;
    const depositMultiplier = depositPercent / 100;

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
    const nightsDesc = i18n.nights(nights);
    const dateRange = `${booking.checkin_date} \u2192 ${booking.checkout_date}`;
    const accommDesc = isPartialDeposit
      ? `${nightsDesc} (${dateRange}) ${i18n.depositNote(depositPercent)}`
      : `${nightsDesc} (${dateRange})`;

    lineItems.push({
      price_data: {
        currency: 'eur',
        product_data: {
          name: i18n.accommodation,
          description: accommDesc,
        },
        unit_amount: Math.round(pricePerNight * depositMultiplier * 100), // cents
      },
      quantity: nights,
    });

    // Cleaning fee
    if (cleaningFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: { name: i18n.cleaningFee },
          unit_amount: Math.round(cleaningFee * depositMultiplier * 100),
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
        name: i18n.longStayDiscount(discount),
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
      payment_intent_data: {
        statement_descriptor: 'VILLA SOLRIA',
        description: `Villa Solria — ${booking.checkin_date} → ${booking.checkout_date}`,
      },
      metadata: {
        booking_id: bookingId,
        checkin_date: booking.checkin_date,
        checkout_date: booking.checkout_date,
        deposit_percent: String(depositPercent),
      },
      success_url: `${origin}/${locale}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/booking/cancel?booking_id=${bookingId}`,
      expires_at: Math.floor(Date.now() / 1000) + sessionTimeoutMin * 60,
      locale,
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
