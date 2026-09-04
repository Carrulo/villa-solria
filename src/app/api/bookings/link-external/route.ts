import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: {
    external_source?: string;
    external_ref?: string;
    linked_to_booking_id?: string | null;
    linked_to_external_source?: string | null;
    linked_to_external_ref?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const {
    external_source,
    external_ref,
    linked_to_booking_id,
    linked_to_external_source,
    linked_to_external_ref,
  } = body;
  if (
    external_source !== 'airbnb_ical' &&
    external_source !== 'booking_ical' &&
    external_source !== 'vrbo_ical'
  ) {
    return NextResponse.json({ error: 'Invalid external_source' }, { status: 400 });
  }
  if (!external_ref) {
    return NextResponse.json({ error: 'Missing external_ref' }, { status: 400 });
  }

  const supabase = createServerClient();

  if (linked_to_booking_id) {
    const { data: parent, error: parentErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', linked_to_booking_id)
      .single();
    if (parentErr || !parent) {
      return NextResponse.json({ error: 'Parent booking not found' }, { status: 404 });
    }
  }

  if (linked_to_booking_id) {
    // Same trap as linking an external entry to itself: if the row we
    // are about to mark as grouped is already this booking's own
    // cleaning, it would hide itself and the clean would disappear.
    const { data: own } = await supabase
      .from('cleaning_tasks')
      .select('id')
      .eq('external_source', external_source)
      .eq('external_ref', external_ref)
      .eq('booking_id', linked_to_booking_id)
      .limit(1);
    if (own && own.length > 0) {
      return NextResponse.json(
        { error: 'Cannot link a cleaning to its own booking' },
        { status: 400 }
      );
    }
  }

  if (linked_to_external_source && linked_to_external_ref) {
    if (
      linked_to_external_source === external_source &&
      linked_to_external_ref === external_ref
    ) {
      return NextResponse.json({ error: 'Cannot link to self' }, { status: 400 });
    }
    const { data: parent, error: parentErr } = await supabase
      .from('cleaning_tasks')
      .select('id')
      .eq('external_source', linked_to_external_source)
      .eq('external_ref', linked_to_external_ref)
      .limit(1);
    if (parentErr || !parent || parent.length === 0) {
      return NextResponse.json({ error: 'Parent external entry not found' }, { status: 404 });
    }
  }

  const { error } = await supabase
    .from('cleaning_tasks')
    .update({
      linked_to_booking_id: linked_to_booking_id || null,
      linked_to_external_source: linked_to_external_source || null,
      linked_to_external_ref: linked_to_external_ref || null,
    })
    .eq('external_source', external_source)
    .eq('external_ref', external_ref);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Whenever we link or unlink, the head's effective stay range may have
  // changed → recompute its cleaning_date so the cleaner sees the right
  // day. The head is either the row we just linked to (link case) or the
  // row we just unlinked (unlink case).
  if (linked_to_external_source && linked_to_external_ref) {
    await refreshHeadCleaningDate(supabase, linked_to_external_source, linked_to_external_ref);
  } else {
    await refreshHeadCleaningDate(supabase, external_source, external_ref);
  }

  return NextResponse.json({ success: true });
}

// A "head" cleaning_task is the one external row that has no linked_to_*
// fields. Its cleaning_date should equal the latest stay_checkout_date
// among itself + all rows linked to it. This handles Booking.com splits
// where a single guest stay arrives as 2-3 iCal events and the admin
// manually groups them.
async function refreshHeadCleaningDate(
  supabase: ReturnType<typeof createServerClient>,
  headSource: string,
  headRef: string,
) {
  const { data: head } = await supabase
    .from('cleaning_tasks')
    .select('id, stay_checkout_date')
    .eq('external_source', headSource)
    .eq('external_ref', headRef)
    .is('linked_to_booking_id', null)
    .is('linked_to_external_ref', null)
    .maybeSingle();
  if (!head) return;

  const { data: children } = await supabase
    .from('cleaning_tasks')
    .select('stay_checkout_date')
    .eq('linked_to_external_source', headSource)
    .eq('linked_to_external_ref', headRef);

  let maxCo = head.stay_checkout_date || '';
  for (const c of children || []) {
    if (c.stay_checkout_date && c.stay_checkout_date > maxCo) maxCo = c.stay_checkout_date;
  }
  if (!maxCo) return;

  await supabase
    .from('cleaning_tasks')
    .update({ cleaning_date: maxCo })
    .eq('id', head.id);
}
