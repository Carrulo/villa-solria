import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { countryToLanguage } from '@/lib/countries';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, country, locale, checkIn, checkOut, guests, message } = body;

    if (!name || !email || !checkIn || !checkOut || !guests) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Dates past the sales horizon are not on the market yet: peak
    // months are held back until the next season's prices are set, and
    // the same window is kept closed on Booking/Airbnb/VRBO. The
    // calendar hides them, but the API is what actually decides.
    const { data: horizonRow } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'booking_open_until')
      .maybeSingle();
    const horizonRaw = horizonRow?.value;
    const openUntil =
      typeof horizonRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(horizonRaw.trim())
        ? horizonRaw.trim()
        : null;
    if (openUntil && checkOut > openUntil) {
      return NextResponse.json(
        { error: 'Dates not open yet', openUntil },
        { status: 409 }
      );
    }

    // Check for overlapping bookings that legitimately hold dates.
    // Only confirmed bookings and Multibanco vouchers in pending_payment
    // block the calendar — plain 'pending' means the form was submitted
    // but the Stripe checkout never completed (abandoned attempts), and
    // those should not prevent a new customer from booking.
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .in('status', ['confirmed', 'pending_payment'])
      .lt('checkin_date', checkOut)
      .gt('checkout_date', checkIn);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json({ error: 'Dates not available' }, { status: 409 });
    }

    // Calculate nights
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < 1) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
    }

    // Price the stay night by night. A stay that straddles two seasons
    // used to match no row at all (the query demanded one season cover
    // the whole range), and dates with no season — next year, before the
    // rates are set — fell through to a hardcoded 100 EUR. Both quietly
    // sold nights below their worth, so an unpriced night is now refused
    // rather than guessed.
    const { data: seasons } = await supabase
      .from('seasons')
      .select(
        'start_date, end_date, price_per_night, cleaning_fee, weekly_discount, biweekly_discount, monthly_discount'
      )
      .lte('start_date', checkOut)
      .gte('end_date', checkIn);

    type SeasonRow = {
      start_date: string;
      end_date: string;
      price_per_night: number;
      cleaning_fee: number | null;
      weekly_discount: number | null;
      biweekly_discount: number | null;
      monthly_discount: number | null;
    };
    const seasonRows = (seasons || []) as SeasonRow[];
    const seasonFor = (iso: string) =>
      seasonRows.find((s) => iso >= s.start_date && iso <= s.end_date) || null;

    let subTotalNights = 0;
    const unpriced: string[] = [];
    for (let i = 0; i < nights; i++) {
      const night = new Date(checkInDate);
      night.setUTCDate(night.getUTCDate() + i);
      const iso = night.toISOString().slice(0, 10);
      const season = seasonFor(iso);
      if (!season) {
        unpriced.push(iso);
        continue;
      }
      subTotalNights += Number(season.price_per_night) || 0;
    }

    if (unpriced.length > 0) {
      return NextResponse.json(
        { error: 'Dates not priced yet', unpriced: unpriced.slice(0, 5) },
        { status: 409 }
      );
    }

    // Fees and discount tiers follow the season the guest checks in on.
    const arrivalSeason = seasonFor(checkIn)!;
    let cleaningFee = 50;
    let weeklyDiscount = 0;
    let biweeklyDiscount = 0;
    let monthlyDiscount = 0;

    cleaningFee = arrivalSeason.cleaning_fee || 50;
    weeklyDiscount = arrivalSeason.weekly_discount || 0;
    biweeklyDiscount = arrivalSeason.biweekly_discount || 0;
    monthlyDiscount = arrivalSeason.monthly_discount || 0;

    // Long-stay discount tier (matches frontend BookingForm logic)
    let discountPercent = 0;
    if (nights >= 28) {
      discountPercent = monthlyDiscount;
    } else if (nights >= 14) {
      discountPercent = biweeklyDiscount;
    } else if (nights >= 7) {
      discountPercent = weeklyDiscount;
    }

    const subTotal = subTotalNights;
    const discountAmount = Math.round(subTotal * (discountPercent / 100));
    let totalPrice = subTotal - discountAmount + cleaningFee;

    // Language: country override wins; otherwise use the site locale the
    // guest was browsing. Falls back to English for safety.
    const countryCode = typeof country === 'string' && country.trim() ? country.trim().toUpperCase() : null;
    const localeLang = ['pt', 'en', 'es', 'de'].includes((locale || '').toLowerCase())
      ? (locale as string).toLowerCase()
      : 'en';
    const language = countryCode ? countryToLanguage(countryCode) : localeLang;

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        guest_name: name,
        guest_email: email,
        guest_phone: phone || null,
        guest_country: countryCode,
        language,
        checkin_date: checkIn,
        checkout_date: checkOut,
        num_guests: parseInt(guests),
        message: message || null,
        num_nights: nights,
        // Blended nightly rate when the stay crosses seasons.
        price_per_night: nights > 0 ? Math.round(subTotalNights / nights) : 0,
        cleaning_fee: cleaningFee,
        total_price: Math.round(totalPrice * 100) / 100,
        status: 'pending',
        payment_status: 'pending',
        source: 'website',
      })
      .select()
      .single();

    if (error) {
      console.error('Booking insert error:', error);
      return NextResponse.json(
        { error: 'Failed to create booking', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, booking: data });
  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
