import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { sendTelegramNotification } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * Daily pending-invoices reminder.
 *
 * Called by GitHub Actions (`invoice-reminder.yml`) every morning at 09:00
 * Lisbon time. Finds every booking where:
 *  - `invoice_details` is set (guest asked for a B2B invoice)
 *  - `invoice_details.issued_at` is null (host hasn't issued it yet)
 *  - `checkout_date` is within reminder window (tomorrow or earlier)
 *
 * For each, sends one Telegram message with urgency depending on how
 * many days late the invoice is. The reminder keeps firing daily until
 * the host clicks "✓ Marcar como emitida" in /admin/bookings.
 *
 * Returns the list of bookings processed so the GitHub Actions log is
 * useful for debugging.
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

function daysBetween(iso: string): number {
  // Positive number = invoice is N days OVERDUE (checkout already passed).
  // Negative = checkout is N days from now (still in the future).
  const today = new Date(todayIso() + 'T00:00:00Z').getTime();
  const target = new Date(iso + 'T00:00:00Z').getTime();
  return Math.round((today - target) / 86400000);
}

function buildMessage(row: PendingRow): string {
  const inv = row.invoice_details!;
  const days = daysBetween(row.checkout_date);

  let header: string;
  if (days < 0) {
    header = `📄 *Fatura amanhã* — ${row.guest_name}`;
  } else if (days === 0) {
    header = `📄 *Fatura HOJE* — ${row.guest_name}`;
  } else if (days <= 3) {
    header = `⚠️ *Fatura ATRASADA ${days} dia${days > 1 ? 's' : ''}* — ${row.guest_name}`;
  } else {
    header = `🚨 *Fatura ATRASADA ${days} dias* — ${row.guest_name}`;
  }

  const lines = [
    header,
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

  const supabase = createServerClient();

  // Pull all candidate rows. We filter the issued_at clause client-side
  // because Postgres can't easily index "JSONB field IS NULL OR missing".
  // Partial index `bookings_invoice_pending_idx` already narrows scan to
  // rows where `invoice_details IS NOT NULL` and `issued_at IS NULL`.
  const today = todayIso();
  // Window: send one reminder for tomorrow's check-out + everything overdue.
  const tomorrow = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  const { data, error } = await supabase
    .from('bookings')
    .select('id, reference, guest_name, checkout_date, invoice_details')
    .not('invoice_details', 'is', null)
    .lte('checkout_date', tomorrow);

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

  // Send Telegram messages sequentially so we don't blast the bot API.
  const sent: { booking_id: string; days_overdue: number }[] = [];
  for (const row of pending) {
    const msg = buildMessage(row);
    await sendTelegramNotification(msg);
    sent.push({
      booking_id: row.id,
      days_overdue: daysBetween(row.checkout_date),
    });
    // Polite pause between sends.
    await new Promise((r) => setTimeout(r, 250));
  }

  return NextResponse.json({ ok: true, count: sent.length, today, sent });
}
