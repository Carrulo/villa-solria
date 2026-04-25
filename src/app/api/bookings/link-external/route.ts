import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: {
    external_source?: string;
    external_ref?: string;
    linked_to_booking_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { external_source, external_ref, linked_to_booking_id } = body;
  if (
    external_source !== 'airbnb_ical' &&
    external_source !== 'booking_ical'
  ) {
    return NextResponse.json({ error: 'Invalid external_source' }, { status: 400 });
  }
  if (!external_ref) {
    return NextResponse.json({ error: 'Missing external_ref' }, { status: 400 });
  }

  const supabase = createServerClient();

  if (linked_to_booking_id) {
    // Sanity-check: parent booking must exist.
    const { data: parent, error: parentErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', linked_to_booking_id)
      .single();
    if (parentErr || !parent) {
      return NextResponse.json({ error: 'Parent booking not found' }, { status: 404 });
    }
  }

  const { error } = await supabase
    .from('cleaning_tasks')
    .update({ linked_to_booking_id: linked_to_booking_id || null })
    .eq('external_source', external_source)
    .eq('external_ref', external_ref);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
