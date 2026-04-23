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

    // Check for overlapping non-cancelled bookings
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .neq('status', 'cancelled')
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

    // Get applicable season price
    const { data: seasons } = await supabase
      .from('seasons')
      .select('price_per_night, cleaning_fee, weekly_discount, biweekly_discount, monthly_discount')
      .lte('start_date', checkIn)
      .gte('end_date', checkOut)
      .limit(1);

    let pricePerNight = 100;
    let cleaningFee = 50;
    let weeklyDiscount = 0;
    let biweeklyDiscount = 0;
    let monthlyDiscount = 0;

    if (seasons && seasons.length > 0) {
      pricePerNight = seasons[0].price_per_night;
      cleaningFee = seasons[0].cleaning_fee || 50;
      weeklyDiscount = seasons[0].weekly_discount || 0;
      biweeklyDiscount = seasons[0].biweekly_discount || 0;
      monthlyDiscount = seasons[0].monthly_discount || 0;
    }

    // Long-stay discount tier (matches frontend BookingForm logic)
    let discountPercent = 0;
    if (nights >= 28) {
      discountPercent = monthlyDiscount;
    } else if (nights >= 14) {
      discountPercent = biweeklyDiscount;
    } else if (nights >= 7) {
      discountPercent = weeklyDiscount;
    }

    const subTotal = pricePerNight * nights;
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
        price_per_night: pricePerNight,
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
