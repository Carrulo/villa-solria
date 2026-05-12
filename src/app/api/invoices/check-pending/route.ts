import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendTelegramNotification } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Daily pending-invoices reminder.
 *
 * Called by GitHub Actions (`invoice-reminder.yml`) every weekday at 09:00
 * Lisbon time. For each booking with `invoice_details` set and `issued_at`
 * null, decides whether today is a reminder day based on the *legal
 * deadline* (Portuguese fatura-recibo Cat. B can be issued until day 5 of
 * the month following the service).
 *
 * Reminder schedule per booking (avoids daily nagging):
 *   • Day before checkout    → ℹ️ heads-up
 *   • Checkout day           → 📄 first reminder + legal deadline date
 *   • Mid-window             → silent
 *   • 5/3/2 days to deadline → ⚠️ countdown
 *   • 1 day to deadline      → 🚨 "amanhã é prazo"
 *   • Deadline day           → 🚨 "HOJE último dia"
 *   • After deadline         → 🚨 "PRAZO ULTRAPASSADO há N dias"
 *
 * Weekends (Sat/Sun) are skipped entirely — finance work happens on
 * weekdays, no point pinging Bruno at 09h Saturday.
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

/**
 * Portuguese fatura-recibo deadline for a given checkout date.
 * Rule: must be issued by day 5 of the month *following* the service.
 * (Standard interpretation for Cat. B independents — confirm with
 * accountant for edge cases like long-stay services spanning months.)
 */
function computeLegalDeadline(checkoutIso: string): string {
  const ck = new Date(checkoutIso + 'T00:00:00Z');
  const y = ck.getUTCFullYear();
  const m = ck.getUTCMonth(); // 0-indexed
  // First day 5 of the next month.
  const deadline = new Date(Date.UTC(y, m + 1, 5));
  return deadline.toISOString().slice(0, 10);
}

type ReminderDecision = {
  send: boolean;
  /** Header line and emoji set by tone. */
  emoji: string;
  headline: string;
};

function decideReminder(checkoutIso: string, guestName: string): ReminderDecision {
  const daysToCheckout = daysUntil(checkoutIso);
  const deadlineIso = computeLegalDeadline(checkoutIso);
  const daysToDeadline = daysUntil(deadlineIso);

  // Day before checkout — gentle heads-up.
  if (daysToCheckout === 1) {
    return {
      send: true,
      emoji: 'ℹ️',
      headline: `Amanhã sai *${guestName}* — depois emite fatura (prazo legal ${deadlineIso}).`,
    };
  }

  // Checkout day — first action prompt.
  if (daysToCheckout === 0) {
    return {
      send: true,
      emoji: '📄',
      headline: `*${guestName}* sai hoje — emite fatura até *${deadlineIso}* (${daysToDeadline} dias).`,
    };
  }

  // Window between checkout+1 and 6 days before deadline: silent.
  if (daysToDeadline > 5) {
    return { send: false, emoji: '', headline: '' };
  }

  // Countdown.
  if (daysToDeadline === 5 || daysToDeadline === 3 || daysToDeadline === 2) {
    return {
      send: true,
      emoji: '⚠️',
      headline: `Faltam *${daysToDeadline} dias* para o prazo legal da fatura de *${guestName}*.`,
    };
  }

  if (daysToDeadline === 1) {
    return {
      send: true,
      emoji: '🚨',
      headline: `*AMANHÃ* é o prazo legal — emite hoje a fatura de *${guestName}*.`,
    };
  }

  if (daysToDeadline === 0) {
    return {
      send: true,
      emoji: '🚨',
      headline: `*HOJE é o ÚLTIMO DIA* — emite agora a fatura de *${guestName}*.`,
    };
  }

  if (daysToDeadline < 0) {
    const lateBy = Math.abs(daysToDeadline);
    return {
      send: true,
      emoji: '🚨',
      headline: `*PRAZO LEGAL ULTRAPASSADO* há ${lateBy} dia${lateBy > 1 ? 's' : ''} — fatura de *${guestName}* ainda por emitir.`,
    };
  }

  // Day 4 — between the 5-day and 3-day reminder. Silent.
  return { send: false, emoji: '', headline: '' };
}

function buildMessage(row: PendingRow, decision: ReminderDecision): string {
  const inv = row.invoice_details!;
  const deadline = computeLegalDeadline(row.checkout_date);
  const lines = [
    `${decision.emoji} ${decision.headline}`,
    '',
    `*Empresa:* ${inv.company || '(sem empresa)'}`,
    `*NIF/VAT:* \`${inv.vat || '(sem NIF)'}\``,
    inv.amount ? `*Valor:* €${inv.amount}` : null,
    inv.email ? `*Email:* ${inv.email}` : null,
    `*Check-out:* ${row.checkout_date}  ·  *Prazo legal:* ${deadline}`,
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
