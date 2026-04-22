import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type UpdateBody = {
  token?: string;
  id?: string;
  cleaning_done?: boolean;
  laundry_taken?: boolean;
  rooms_with_laundry?: number;
};

export async function POST(req: Request) {
  let body: UpdateBody;
  try {
    body = (await req.json()) as UpdateBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.token || !body.id) {
    return NextResponse.json({ error: 'Missing token or id' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: tokenRow } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'cleaner_token')
    .maybeSingle();
  const expected = typeof tokenRow?.value === 'string' ? tokenRow.value.trim() : '';
  if (!expected || expected !== body.token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch task first so we can read current state (price snapshots, paid flags).
  const { data: task, error: fetchError } = await supabase
    .from('cleaning_tasks')
    .select('*')
    .eq('id', body.id)
    .maybeSingle();

  if (fetchError || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  const patch: Record<string, unknown> = {};

  if (typeof body.cleaning_done === 'boolean') {
    if (task.cleaning_paid) {
      return NextResponse.json({ error: 'Limpeza já paga — contactar Bruno' }, { status: 409 });
    }
    patch.cleaning_done = body.cleaning_done;
    patch.cleaning_done_at = body.cleaning_done ? new Date().toISOString() : null;
  }

  if (typeof body.laundry_taken === 'boolean') {
    if (task.laundry_paid) {
      return NextResponse.json({ error: 'Roupas já pagas — contactar Bruno' }, { status: 409 });
    }
    if (body.laundry_taken) {
      const rooms = Math.max(0, Number(body.rooms_with_laundry ?? 0) | 0);

      // Read current laundry table + base fee from settings (snapshot).
      const { data: feeRows } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['laundry_fee_per_room']);

      let table: Record<string, number> = {};
      for (const row of feeRows || []) {
        if (row.key === 'laundry_fee_per_room') {
          try {
            const parsed = JSON.parse(row.value);
            for (const [k, v] of Object.entries(parsed)) {
              table[k] = Number(v) || 0;
            }
          } catch {
            table = {};
          }
        }
      }
      const fee = rooms > 0 ? Number(table[String(rooms)] ?? 0) : 0;

      patch.laundry_taken = true;
      patch.laundry_taken_at = new Date().toISOString();
      patch.rooms_with_laundry = rooms;
      patch.laundry_fee_snapshot = fee;
    } else {
      patch.laundry_taken = false;
      patch.laundry_taken_at = null;
      patch.rooms_with_laundry = 0;
      patch.laundry_fee_snapshot = 0;
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ task });
  }

  const { data: updated, error: updateError } = await supabase
    .from('cleaning_tasks')
    .update(patch)
    .eq('id', body.id)
    .select('*')
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: updateError?.message || 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ task: updated });
}
