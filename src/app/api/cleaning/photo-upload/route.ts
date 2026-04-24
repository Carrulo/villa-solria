import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const BUCKET = 'property-photos';

async function verifyToken(token: string): Promise<boolean> {
  if (!token) return false;
  const supabase = createServerClient();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'cleaner_token')
    .maybeSingle();
  const expected = typeof data?.value === 'string' ? data.value.trim() : '';
  return !!expected && expected === token;
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Multipart form-data esperado' }, { status: 400 });
  }

  const token = String(form.get('token') || '');
  const taskId = String(form.get('task_id') || '');
  const file = form.get('file') as File | null;

  if (!(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!taskId || !file) {
    return NextResponse.json({ error: 'task_id e file são obrigatórios' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Apenas imagens são aceites' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Foto demasiado grande (máx 8MB)' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: task } = await supabase
    .from('cleaning_tasks')
    .select('id, completed_at, cleaning_paid, photo_urls')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
  if (task.completed_at || task.cleaning_paid) {
    return NextResponse.json({ error: 'Limpeza já fechada — não aceita mais fotos' }, { status: 409 });
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  const path = `cleaning/${taskId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, cacheControl: '3600', upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = pub.publicUrl;

  const current = Array.isArray(task.photo_urls) ? (task.photo_urls as string[]) : [];
  const next = [...current, url];

  const { data: updated, error: updErr } = await supabase
    .from('cleaning_tasks')
    .update({ photo_urls: next })
    .eq('id', taskId)
    .select('*')
    .maybeSingle();

  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message || 'Falha ao guardar' }, { status: 500 });
  }

  return NextResponse.json({ task: updated, url });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token') || '';
  const taskId = url.searchParams.get('task_id') || '';
  const photoUrl = url.searchParams.get('url') || '';

  if (!(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!taskId || !photoUrl) {
    return NextResponse.json({ error: 'task_id e url são obrigatórios' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: task } = await supabase
    .from('cleaning_tasks')
    .select('id, completed_at, cleaning_paid, photo_urls')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 });
  if (task.completed_at || task.cleaning_paid) {
    return NextResponse.json({ error: 'Limpeza já fechada' }, { status: 409 });
  }

  const current = Array.isArray(task.photo_urls) ? (task.photo_urls as string[]) : [];
  const next = current.filter((u) => u !== photoUrl);

  // Best-effort remove from storage too.
  const m = photoUrl.match(/\/object\/public\/property-photos\/(.+)$/);
  if (m && m[1]) {
    await supabase.storage.from(BUCKET).remove([m[1]]).catch(() => null);
  }

  const { data: updated } = await supabase
    .from('cleaning_tasks')
    .update({ photo_urls: next })
    .eq('id', taskId)
    .select('*')
    .maybeSingle();

  return NextResponse.json({ task: updated });
}
