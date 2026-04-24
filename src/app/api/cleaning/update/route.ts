import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import {
  CLEANING_SUBTASK_KEYS,
  isChecklistComplete,
} from '@/lib/cleaning-checklist';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type UpdateBody = {
  token?: string;
  id?: string;
  cleaning_done?: boolean;
  laundry_taken?: boolean;
  rooms_with_laundry?: number;
  subtask_toggle?: { key: string; done: boolean };
  start?: boolean;
  close?: boolean;
  cleaner_notes?: string | null;
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

  // Free-text note from the cleaner.
  if (typeof body.cleaner_notes === 'string') {
    const trimmed = body.cleaner_notes.trim();
    patch.cleaner_notes = trimmed.length > 0 ? trimmed.slice(0, 2000) : null;
  } else if (body.cleaner_notes === null) {
    patch.cleaner_notes = null;
  }

  // Subtask checkbox toggle (one item at a time, atomic).
  if (body.subtask_toggle && CLEANING_SUBTASK_KEYS.includes(body.subtask_toggle.key)) {
    const current = (task.subtask_progress || {}) as Record<string, unknown>;
    const next: Record<string, boolean> = { ...current } as Record<string, boolean>;
    next[body.subtask_toggle.key] = body.subtask_toggle.done === true;
    patch.subtask_progress = next;
    // Mark started_at the first time anything is ticked.
    if (!task.started_at && body.subtask_toggle.done === true) {
      patch.started_at = new Date().toISOString();
    }
  }

  if (body.start === true && !task.started_at) {
    patch.started_at = new Date().toISOString();
  }

  // Close the cleaning: validate everything is done before stamping.
  if (body.close === true) {
    if (task.cleaning_paid) {
      return NextResponse.json({ error: 'Limpeza já paga — não pode fechar.' }, { status: 409 });
    }
    const finalProgress = (patch.subtask_progress as Record<string, boolean> | undefined) ||
      (task.subtask_progress as Record<string, boolean> | undefined) ||
      {};
    if (!isChecklistComplete(finalProgress)) {
      return NextResponse.json(
        { error: 'Marca todos os items da checklist antes de fechar.' },
        { status: 400 },
      );
    }
    if (!task.laundry_taken && body.laundry_taken !== true) {
      return NextResponse.json(
        { error: 'Indica primeiro quantos quartos têm roupa (ou "sem roupa").' },
        { status: 400 },
      );
    }
    const photos = Array.isArray(task.photo_urls) ? task.photo_urls : [];
    const incomingPhotos = patch.photo_urls as unknown[] | undefined;
    const photoCount = (incomingPhotos?.length ?? photos.length);
    if (photoCount < 3) {
      return NextResponse.json(
        { error: `Faltam fotos de prova (${photoCount}/3 mínimo).` },
        { status: 400 },
      );
    }
    patch.completed_at = new Date().toISOString();
    if (!task.cleaning_done) {
      patch.cleaning_done = true;
      patch.cleaning_done_at = new Date().toISOString();
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
