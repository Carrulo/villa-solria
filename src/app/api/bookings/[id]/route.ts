import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function datesInRange(start: string, endExclusive: string): string[] {
  const out: string[] = [];
  const d = new Date(start + 'T00:00:00Z');
  const stop = new Date(endExclusive + 'T00:00:00Z');
  while (d < stop) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  let confirmation = '';
  try {
    const body = (await req.json()) as { confirmation?: string };
    confirmation = (body.confirmation || '').trim();
  } catch {
    // allow empty body on query confirm
  }
  if (!confirmation) {
    const u = new URL(req.url);
    confirmation = u.searchParams.get('confirmation') || '';
  }

  const supabase = createServerClient();

  const { data: booking, error: fetchErr } = await supabase
    .from('bookings')
    .select('id, reference, guest_name, checkin_date, checkout_date, source')
    .eq('id', id)
    .single();

  if (fetchErr || !booking) {
    return NextResponse.json({ error: fetchErr?.message || 'not found' }, { status: 404 });
  }

  const expected = booking.reference || 'APAGAR';
  if (confirmation.toUpperCase() !== expected.toUpperCase()) {
    return NextResponse.json(
      { error: `Confirmação inválida. Esperava "${expected}".`, expected },
      { status: 400 },
    );
  }

  // Remove derived rows first. These are best-effort; the main delete is
  // what matters and we cascade nothing in DB.
  await supabase.from('cleaning_tasks').delete().eq('booking_id', id);

  // blocked_dates entries created by this manual/website booking — match
  // by date range + source 'website' (manual bookings also stamp 'website').
  if (booking.source === 'website' || booking.source === 'manual') {
    const dates = datesInRange(booking.checkin_date, booking.checkout_date);
    if (dates.length > 0) {
      await supabase
        .from('blocked_dates')
        .delete()
        .in('date', dates)
        .eq('source', 'website');
    }
  }

  const { error: delErr } = await supabase.from('bookings').delete().eq('id', id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    deleted: { id, reference: booking.reference, guest_name: booking.guest_name },
  });
}
