import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendTelegramNotification, buildGuestReviewMessage } from '@/lib/telegram';
import { reviewWindow } from '@/lib/review-window';

// Guest review of the stay, authenticated by the booking's guide_token —
// the private link only a real guest has. One review per booking; it is
// saved hidden and appears on the site once the host approves it in
// /admin/reviews. Until then the guest may send it again to correct it.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { token?: string; stars?: number; comment?: string; name?: string; country?: string; locale?: string }
    | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const token = (body.token || '').trim();
  const comment = (body.comment || '').trim();
  const stars = typeof body.stars === 'number' ? Math.round(body.stars) : 0;
  const name = (body.name || '').trim().slice(0, 60);
  const country = (body.country || '').trim().slice(0, 60);
  const locale = (body.locale || '').slice(0, 4) || 'pt';

  if (token === 'preview') return NextResponse.json({ ok: true, preview: true });
  if (!token || token.length < 8) return NextResponse.json({ error: 'token_required' }, { status: 401 });
  if (stars < 1 || stars > 5) return NextResponse.json({ error: 'rating_required' }, { status: 400 });
  if (comment.length < 10) return NextResponse.json({ error: 'comment_too_short' }, { status: 400 });
  if (comment.length > 3000) return NextResponse.json({ error: 'comment_too_long' }, { status: 400 });

  const supabase = createServerClient();
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('id, guest_name, status, checkin_date, checkout_date')
    .eq('guide_token', token)
    .maybeSingle();
  if (bErr) return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  if (!booking || booking.status === 'cancelled') {
    return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
  }
  if (reviewWindow(booking.checkout_date, new Date().toISOString().slice(0, 10)) !== 'open') {
    return NextResponse.json({ error: 'window_closed' }, { status: 403 });
  }

  const row = {
    booking_id: booking.id,
    verified: true,
    visible: false,
    guest_name: name || (booking.guest_name || '').trim().split(/\s+/)[0] || 'Hóspede',
    guest_country: country,
    // Stored on the 1-10 scale the other reviews use (Booking's).
    rating: stars * 2,
    comment,
    language: locale,
    source: 'Villa Solria',
    review_date: booking.checkout_date,
  };

  const { data: existing } = await supabase
    .from('reviews')
    .select('id, visible')
    .eq('booking_id', booking.id)
    .maybeSingle();
  if (existing?.visible) return NextResponse.json({ error: 'already_published' }, { status: 409 });

  const { error: writeErr } = existing
    ? await supabase.from('reviews').update(row).eq('id', existing.id)
    : await supabase.from('reviews').insert(row);
  if (writeErr) return NextResponse.json({ error: 'save_failed' }, { status: 500 });

  void sendTelegramNotification(
    buildGuestReviewMessage({
      guest_name: row.guest_name,
      stars,
      comment,
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
    })
  );

  return NextResponse.json({ ok: true });
}
