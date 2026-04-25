import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerClient } from '@/lib/supabase-server';
import type { CleaningTask } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function addDays(date: string, days: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  });
}

function renderHTML(today: CleaningTask[], tomorrow: CleaningTask[], dashboardUrl: string): string {
  const row = (t: CleaningTask) => {
    const guest = t.guest_name || 'Reserva';
    const guests = t.num_guests ? ` · ${t.num_guests} hóspede(s)` : '';
    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111;">
          <strong>${guest}</strong><span style="color:#6b7280">${guests}</span>
        </td>
      </tr>`;
  };

  const section = (label: string, date: string, list: CleaningTask[]) => `
    <h3 style="margin:24px 0 8px;color:#111;font-size:16px;">${label} — ${formatDate(date)}</h3>
    ${
      list.length === 0
        ? '<p style="color:#6b7280;font-size:14px;margin:0;">Sem limpezas.</p>'
        : `<table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden;">${list
            .map(row)
            .join('')}</table>`
    }
  `;

  const today0 = new Date().toISOString().slice(0, 10);
  const tomorrow0 = addDays(today0, 1);

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
      <h2 style="margin:0 0 16px;">Limpezas — Villa Solria</h2>
      <p style="margin:0;color:#4b5563;font-size:14px;">Resumo diário das tarefas.</p>
      ${section('Hoje', today0, today)}
      ${section('Amanhã', tomorrow0, tomorrow)}
      <p style="margin-top:24px;">
        <a href="${dashboardUrl}" style="display:inline-block;padding:10px 16px;background:#facc15;color:#111;text-decoration:none;border-radius:8px;font-weight:600;">Abrir dashboard</a>
      </p>
      <p style="margin-top:24px;color:#9ca3af;font-size:12px;">Este email é automático. Para dúvidas, contacta o Bruno.</p>
    </div>
  `;
}

export async function GET(req: Request) {
  // Authorize either via Vercel cron secret OR via internal GH Actions token
  const url = new URL(req.url);
  const secret =
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    url.searchParams.get('secret') ||
    '';
  const expected = process.env.CLEANING_EMAIL_SECRET;

  if (!expected) {
    return NextResponse.json(
      { error: 'CLEANING_EMAIL_SECRET not set' },
      { status: 500 }
    );
  }
  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['cleaner_email', 'cleaner_token', 'property_name', 'email_from_address']);

  const settings: Record<string, string> = {};
  (settingsRows || []).forEach((r: { key: string; value: string }) => {
    settings[r.key] = r.value || '';
  });

  const to = (settings.cleaner_email || '').trim();
  if (!to) {
    return NextResponse.json({ skipped: true, reason: 'cleaner_email not set' });
  }

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = addDays(today, 1);

  const { data: tasksData } = await supabase
    .from('cleaning_tasks')
    .select('*')
    .is('linked_to_booking_id', null)
    .is('linked_to_external_ref', null)
    .in('cleaning_date', [today, tomorrow])
    .order('cleaning_date', { ascending: true });

  const all = (tasksData || []) as CleaningTask[];
  const todayTasks = all.filter((t) => t.cleaning_date === today && !t.cleaning_done);
  const tomorrowTasks = all.filter((t) => t.cleaning_date === tomorrow && !t.cleaning_done);

  if (todayTasks.length === 0 && tomorrowTasks.length === 0) {
    return NextResponse.json({ skipped: true, reason: 'no pending tasks' });
  }

  const token = settings.cleaner_token || '';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://villa-solria.vercel.app';
  const dashboardUrl = `${baseUrl}/cleaning?token=${encodeURIComponent(token)}`;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  const fromAddress = (settings.email_from_address || 'Villa Solria <reservas@villasolria.com>').trim();

  const { error } = await resend.emails.send({
    from: fromAddress,
    to,
    subject: `Limpezas de hoje (${todayTasks.length}) e amanhã (${tomorrowTasks.length})`,
    html: renderHTML(todayTasks, tomorrowTasks, dashboardUrl),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sent: true,
    to,
    today: todayTasks.length,
    tomorrow: tomorrowTasks.length,
  });
}
