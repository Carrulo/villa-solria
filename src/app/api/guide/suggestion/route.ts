import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendTelegramNotification, buildGuestSuggestionMessage } from '@/lib/telegram';

// Guest → host suggestion box. Public endpoint authenticated only by the
// booking's guide_token (same secret used to access the guide page). No
// auth required — same trust level as the guide URL the guest already has.
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { token?: string; message?: string; rating?: number; locale?: string }
    | null;
  if (!body) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });

  const token = (body.token || '').trim();
  const message = (body.message || '').trim();
  const rating =
    typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5
      ? Math.round(body.rating)
      : null;
  const locale = (body.locale || '').slice(0, 4) || null;

  // Special preview token bypasses booking lookup but still gets logged so
  // we can dry-run the form without ever creating a real submission.
  if (token === 'preview') {
    return NextResponse.json({ ok: true, preview: true });
  }

  if (!token || token.length < 8) {
    return NextResponse.json({ error: 'token_required' }, { status: 401 });
  }
  if (message.length < 2) {
    return NextResponse.json({ error: 'message_too_short' }, { status: 400 });
  }
  if (message.length > 4000) {
    return NextResponse.json({ error: 'message_too_long' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: booking, error: bErr } = await supabase
    .from('bookings')
    .select('id, guest_name, status, reference, checkin_date, checkout_date')
    .eq('guide_token', token)
    .maybeSingle();
  if (bErr) return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
  if (!booking || booking.status === 'cancelled') {
    return NextResponse.json({ error: 'booking_not_found' }, { status: 404 });
  }

  const { error: insErr } = await supabase.from('guest_suggestions').insert({
    booking_id: booking.id,
    guest_name: booking.guest_name,
    locale,
    rating,
    message,
  });
  if (insErr) return NextResponse.json({ error: 'insert_failed' }, { status: 500 });

  // Fire-and-forget Telegram ping so Bruno does not have to refresh
  // /admin/suggestions to find out something arrived. Failure here is
  // non-blocking — the suggestion is already persisted.
  const b = booking as {
    id: string;
    guest_name: string | null;
    reference?: string | null;
    checkin_date?: string | null;
    checkout_date?: string | null;
  };
  void sendTelegramNotification(
    buildGuestSuggestionMessage({
      guest_name: b.guest_name,
      rating,
      message,
      reference: b.reference,
      checkin_date: b.checkin_date,
      checkout_date: b.checkout_date,
    })
  );

  return NextResponse.json({ ok: true });
}
