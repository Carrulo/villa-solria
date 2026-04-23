import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendBookingConfirmationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Body = {
  guest_name?: string;
  guest_phone?: string;
  guest_email?: string;
  checkin_date?: string;
  checkout_date?: string;
  num_guests?: number;
  total_price?: number;
  deposit_paid?: number;
  deposit_date?: string;
  language?: string;
  notes?: string;
  mid_stay_dates?: string[];
};

function daysBetween(from: string, to: string): number {
  const a = new Date(from + 'T00:00:00Z').getTime();
  const b = new Date(to + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

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

async function nextManualReference(
  supabase: ReturnType<typeof createServerClient>
): Promise<string> {
  const year = new Date().getUTCFullYear();
  const prefix = `VS-M-${year}-`;
  const { data } = await supabase
    .from('bookings')
    .select('reference')
    .like('reference', `${prefix}%`)
    .order('reference', { ascending: false })
    .limit(1);
  const last = data?.[0]?.reference as string | undefined;
  const n = last ? parseInt(last.slice(prefix.length), 10) + 1 : 1;
  return `${prefix}${String(n).padStart(4, '0')}`;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const guest_name = (body.guest_name || '').trim();
  const guest_phone = (body.guest_phone || '').trim();
  const guest_email = (body.guest_email || '').trim();
  const checkin_date = (body.checkin_date || '').trim();
  const checkout_date = (body.checkout_date || '').trim();
  const num_guests = Math.max(1, Math.floor(Number(body.num_guests) || 1));
  const total_price = Math.max(0, Number(body.total_price) || 0);
  const deposit_paid = Math.max(0, Number(body.deposit_paid) || 0);
  const notes = (body.notes || '').trim();
  const mid_stay_dates = Array.isArray(body.mid_stay_dates)
    ? body.mid_stay_dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    : [];

  if (!guest_name) {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkin_date) || !/^\d{4}-\d{2}-\d{2}$/.test(checkout_date)) {
    return NextResponse.json({ error: 'Datas inválidas' }, { status: 400 });
  }
  if (checkout_date <= checkin_date) {
    return NextResponse.json({ error: 'Saída tem de ser depois da entrada' }, { status: 400 });
  }

  const num_nights = daysBetween(checkin_date, checkout_date);
  const price_per_night = num_nights > 0 ? total_price / num_nights : total_price;
  const supabase = createServerClient();

  // Check for overlap with existing confirmed bookings.
  const occupied = datesInRange(checkin_date, checkout_date);
  const { data: conflict } = await supabase
    .from('blocked_dates')
    .select('date, source')
    .in('date', occupied)
    .limit(1);
  if (conflict && conflict.length > 0) {
    return NextResponse.json(
      { error: `Datas já bloqueadas (${conflict[0].date} · ${conflict[0].source})` },
      { status: 409 }
    );
  }

  // Compose the booking row.
  const reference = await nextManualReference(supabase);
  let stamp: string;
  const depositDateRaw = (body.deposit_date || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(depositDateRaw)) {
    const [y, mo, d] = depositDateRaw.split('-');
    stamp = `${d}/${mo}/${y}`;
  } else {
    const today = new Date();
    stamp = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  }
  const messageBlob = [
    notes || '',
    deposit_paid > 0 ? `${stamp} — Sinal pago: ${deposit_paid}€` : '',
    guest_phone ? `Tel: ${guest_phone}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const { data: inserted, error: insertError } = await supabase
    .from('bookings')
    .insert({
      guest_name,
      guest_email: guest_email || '',
      guest_phone: guest_phone || null,
      checkin_date,
      checkout_date,
      num_guests,
      num_nights,
      price_per_night,
      cleaning_fee: 0,
      total_price,
      status: 'confirmed',
      payment_status: 'paid',
      source: 'manual',
      language: ['pt', 'en', 'es', 'de'].includes((body.language || '').toLowerCase())
        ? (body.language || '').toLowerCase()
        : 'pt',
      message: messageBlob || null,
      reference,
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: insertError?.message || 'Failed to create booking' },
      { status: 500 }
    );
  }

  const bookingId = inserted.id as string;

  // Block dates for the stay.
  const blockedRows = occupied.map((date) => ({
    date,
    source: 'website',
    note: `Reserva manual: ${guest_name}`,
  }));
  if (blockedRows.length > 0) {
    await supabase.from('blocked_dates').insert(blockedRows);
  }

  // Fetch base cleaning fee for snapshots.
  const { data: feeRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'cleaning_base_fee')
    .maybeSingle();
  const baseFee = Number(feeRow?.value ?? 50) || 50;

  // Cleaning task at check-in (the "arrival prep" task — unique per booking).
  await supabase.from('cleaning_tasks').insert({
    booking_id: bookingId,
    cleaning_date: checkin_date,
    checkin_date,
    stay_checkout_date: checkout_date,
    guest_name,
    num_guests,
    cleaning_fee_snapshot: baseFee,
    laundry_fee_snapshot: 0,
    rooms_with_laundry: 0,
  });

  // Additional mid-stay cleanings (not linked via booking_id because of
  // the unique partial index — rely on admin to not duplicate).
  const validMidStays = mid_stay_dates
    .filter((d) => d > checkin_date && d < checkout_date)
    .map((d) => ({
      cleaning_date: d,
      checkin_date: d,
      stay_checkout_date: d,
      guest_name: `${guest_name} (limpeza intermédia)`,
      num_guests,
      cleaning_fee_snapshot: baseFee,
      laundry_fee_snapshot: 0,
      rooms_with_laundry: 0,
      notes: `Ref: ${reference}`,
    }));

  if (validMidStays.length > 0) {
    await supabase.from('cleaning_tasks').insert(validMidStays);
  }

  // Send confirmation email if the guest has one. Fire-and-forget so a
  // Resend hiccup doesn't fail the whole booking create.
  if (guest_email) {
    sendBookingConfirmationEmail({
      reference,
      guest_name,
      guest_email,
      checkin_date,
      checkout_date,
      num_nights,
      num_guests,
      total_price,
      language:
        ['pt', 'en', 'es', 'de'].includes((body.language || '').toLowerCase())
          ? (body.language || '').toLowerCase()
          : 'pt',
    }).catch((e) => console.error('[manual-booking] confirmation email failed:', e));
  }

  return NextResponse.json({
    ok: true,
    booking_id: bookingId,
    reference,
    mid_stays_created: validMidStays.length,
  });
}
