import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, checkIn, checkOut, guests, message } = body;

    if (!name || !email || !checkIn || !checkOut || !guests) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Check for overlapping confirmed bookings
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id')
      .neq('status', 'cancelled')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);

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
      .select('price_per_night, cleaning_fee, weekly_discount')
      .lte('start_date', checkIn)
      .gte('end_date', checkOut)
      .limit(1);

    let pricePerNight = 100;
    let cleaningFee = 50;
    let weeklyDiscount = 0;

    if (seasons && seasons.length > 0) {
      pricePerNight = seasons[0].price_per_night;
      cleaningFee = seasons[0].cleaning_fee || 50;
      weeklyDiscount = seasons[0].weekly_discount || 0;
    }

    let totalPrice = pricePerNight * nights + cleaningFee;
    if (nights >= 7 && weeklyDiscount > 0) {
      totalPrice = totalPrice * (1 - weeklyDiscount / 100);
    }

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        guest_name: name,
        guest_email: email,
        guest_phone: phone || null,
        check_in: checkIn,
        check_out: checkOut,
        guests: parseInt(guests),
        message: message || null,
        nights,
        total_price: Math.round(totalPrice * 100) / 100,
        status: 'pending',
        payment_status: 'pending',
        source: 'website',
      })
      .select()
      .single();

    if (error) {
      console.error('Booking insert error:', error);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    return NextResponse.json({ success: true, booking: data });
  } catch (err) {
    console.error('Booking API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
