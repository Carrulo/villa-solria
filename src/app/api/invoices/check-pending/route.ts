import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendTelegramNotification } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Daily pending-invoices reminder. Simple, low-noise:
 *
 *   • Checkout day (day 0) → 📄 "Lançar fatura — hóspede saiu hoje"
 *   • Day +1               → ⚠️ "Em atraso — ainda por emitir"
 *   • Day +2 onwards       → silent (the yellow banner on /admin/bookings
 *                            already shows it as an overdue task; no
 *                            more daily Telegram nags)
 *
 * Marking the invoice as issued in the admin removes the row from the
 * pending query and stops further reminders.
 *
 * Weekends (Sat/Sun) are skipped — Bruno doesn't process invoices on
 * those days. workflow_dispatch tests can pass `?force=1` to override.
 */
type InvoiceDetails = {
  company?: string;
  vat?: string;
  amount?: string;
  email?: string;
  issued_at?: string | null;
};

type PendingRow = {
  id: string;
  reference: string | null;
  guest_name: string;
  checkout_date: string;
  invoice_details: InvoiceDetails | null;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function isWeekend(): boolean {
  const day = new Date().getUTCDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
}

function daysUntil(iso: string): number {
  // Positive = future, negative = past, 0 = today.
  const today = new Date(todayIso() + 'T00:00:00Z').getTime();
  const target = new Date(iso + 'T00:00:00Z').getTime();
  return Math.round((target - today) / 86400000);
}

type ReminderDecision = {
  send: boolean;
  emoji: string;
  headline: string;
};

/**
 * Decide if today is a reminder day for this booking.
 *  - 0 days after checkout (= checkout today): first ping
 *  - 1 day after checkout: follow-up "em atraso"
 *  - Otherwise: silent (banner in admin keeps it as a passive overdue
 *    task until Bruno marks as emitted).
 */
function decideReminder(checkoutIso: string, guestName: string): ReminderDecision {
  const daysSinceCheckout = -daysUntil(checkoutIso); // positive = past

  if (daysSinceCheckout === 0) {
    return {
      send: true,
      emoji: '📄',
      headline: `Lançar fatura — *${guestName}* saiu hoje.`,
    };
  }
  if (daysSinceCheckout === 1) {
    return {
      send: true,
      emoji: '⚠️',
      headline: `*Em atraso* — fatura de *${guestName}* (saiu ontem) ainda por emitir.`,
    };
  }
  return { send: false, emoji: '', headline: '' };
}

function buildMessage(row: PendingRow, decision: ReminderDecision): string {
  const inv = row.invoice_details!;
  const lines = [
    `${decision.emoji} ${decision.headline}`,
    '',
    `*Empresa:* ${inv.company || '(sem empresa)'}`,
    `*NIF/VAT:* \`${inv.vat || '(sem NIF)'}\``,
    inv.amount ? `*Valor:* €${inv.amount}` : null,
    inv.email ? `*Email:* ${inv.email}` : null,
    `*Check-out:* ${row.checkout_date}`,
    '',
    '👉 Emite no [Portal das Finanças](https://www.portaldasfinancas.gov.pt/at/html/index.html) e marca como emitida em /admin/bookings.',
  ].filter(Boolean);
  return lines.join('\n');
}

export async function GET(request: Request) {
  // Light auth: a static token in env, or open if not set. GitHub Actions
  // passes it as Bearer header.
  const expected = process.env.INVOICE_REMINDER_TOKEN;
  if (expected) {
    const got = request.headers.get('authorization');
    if (got !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  // Skip weekends — Bruno doesn't emit invoices on Sat/Sun. Honor a
  // `?force=1` query so the workflow_dispatch test trigger still works
  // regardless of the day.
  const force = new URL(request.url).searchParams.get('force') === '1';
  if (isWeekend() && !force) {
    return NextResponse.json({ ok: true, count: 0, skipped: 'weekend' });
  }

  const supabase = createServerClient();
  const today = todayIso();

  // No date filter — the per-row decideReminder() routine decides whether
  // today is a reminder day. The partial index `bookings_invoice_pending_idx`
  // already keeps the scan cheap (only rows with invoice_details NOT NULL
  // and issued_at IS NULL are scanned).
  const { data, error } = await supabase
    .from('bookings')
    .select('id, reference, guest_name, checkout_date, invoice_details')
    .not('invoice_details', 'is', null);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as PendingRow[];
  const pending = rows.filter((r) => {
    const inv = r.invoice_details;
    if (!inv) return false;
    if (inv.issued_at) return false;
    return true;
  });

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, count: 0, today });
  }

  const sent: { booking_id: string; reason: string }[] = [];
  const skipped: { booking_id: string; reason: string }[] = [];

  for (const row of pending) {
    const decision = decideReminder(row.checkout_date, row.guest_name);
    if (!decision.send) {
      skipped.push({ booking_id: row.id, reason: 'mid-window-silent' });
      continue;
    }
    const msg = buildMessage(row, decision);
    await sendTelegramNotification(msg);
    sent.push({ booking_id: row.id, reason: decision.headline });
    await new Promise((r) => setTimeout(r, 250));
  }

  return NextResponse.json({
    ok: true,
    today,
    count_sent: sent.length,
    count_skipped: skipped.length,
    sent,
    skipped,
  });
}
