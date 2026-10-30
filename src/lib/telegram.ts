import { createServerClient } from './supabase-server';

/**
 * Send a Telegram notification to the property owner.
 * Reads bot token and chat ID from settings table, with env var fallback.
 * Never throws — a failed notification must not fail a payment webhook.
 *
 * Until 2026-10-24 this fired one fetch and never looked at the answer.
 * The 23 Oct booking (VS-2026-0027, 5 511 €) went through end to end —
 * confirmed, dates blocked, guest emailed — and no Telegram arrived, with
 * nothing anywhere to say why: Vercel keeps function logs for about a day.
 * Now it checks the response, retries once, drops Markdown if Telegram
 * cannot parse it (a guest named `Ana_Maria` would break the whole
 * message), and on final failure leaves a row in `notifications`, which
 * the admin bell shows and which outlives the logs.
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  const supabase = createServerClient();
  try {
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['telegram_bot_token', 'telegram_chat_id']);

    const settings: Record<string, string> = {};
    for (const row of rows ?? []) {
      settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    }

    const botToken = settings['telegram_bot_token'] || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = settings['telegram_chat_id'] || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      await recordFailure(supabase, message, 'token ou chat ID do Telegram em falta');
      return;
    }

    let parseMode: 'Markdown' | undefined = 'Markdown';
    let lastError = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            ...(parseMode ? { parse_mode: parseMode } : {}),
          }),
          // The Stripe webhook has maxDuration 30 s for email + Telegram.
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) return;

        const body = await res.text();
        lastError = `HTTP ${res.status}: ${body.slice(0, 300)}`;
        console.error('[telegram] send failed:', lastError);

        if (res.status === 400 && parseMode && /parse entities/i.test(body)) {
          parseMode = undefined; // same text, no formatting
          continue;
        }
        if (res.status < 500 && res.status !== 429) break; // retrying will not help
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.error('[telegram] send error:', lastError);
      }
    }

    await recordFailure(supabase, message, lastError);
  } catch (err) {
    console.error('[telegram] Failed to send notification:', err);
    await recordFailure(supabase, message, err instanceof Error ? err.message : String(err));
  }
}

async function recordFailure(
  supabase: ReturnType<typeof createServerClient>,
  message: string,
  reason: string
): Promise<void> {
  try {
    const firstLine = message.split('\n')[0].replace(/[*_`]/g, '').trim();
    await supabase.from('notifications').insert({
      type: 'telegram_failed',
      title: `Telegram falhou — ${firstLine}`.slice(0, 200),
      body: `${reason}\n\n${message.replace(/[*_`]/g, '')}`.slice(0, 2000),
    });
  } catch (err) {
    console.error('[telegram] could not record failure:', err);
  }
}

/* ------------------------------------------------------------------ */
/*  Pre-built notification messages                                    */
/* ------------------------------------------------------------------ */

export function buildNewBookingMessage(booking: {
  reference?: string;
  guest_name: string;
  guest_email: string;
  guest_phone?: string | null;
  checkin_date: string;
  checkout_date: string;
  num_nights: number;
  num_guests: number;
  total_price: number;
  mid_stay_cleanings?: number;
  has_pet?: boolean;
  pet_deposit?: number;
}): string {
  return [
    '🎉 *Nova Reserva Confirmada!*',
    '',
    `📋 Ref: *${booking.reference || '—'}*`,
    `👤 ${booking.guest_name}`,
    `📧 ${booking.guest_email}`,
    booking.guest_phone ? `📱 ${booking.guest_phone}` : '',
    '',
    `📅 ${booking.checkin_date} → ${booking.checkout_date}`,
    `🌙 ${booking.num_nights} noite${booking.num_nights > 1 ? 's' : ''} · ${booking.num_guests} hóspede${booking.num_guests > 1 ? 's' : ''}`,
    `💰 *${booking.total_price.toFixed(0)}€*`,
    booking.mid_stay_cleanings ? `🧹 ${booking.mid_stay_cleanings} limpeza(s) semanal(is) agendadas` : '',
    booking.has_pet ? `🐕 Traz animal — caução ${Number(booking.pet_deposit || 0).toFixed(0)}€ a devolver após a saída` : '',
    '',
    '✅ Pagamento recebido via Stripe',
  ].filter(Boolean).join('\n');
}

export function buildCancellationMessage(booking: {
  reference?: string;
  guest_name: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
}): string {
  return [
    '❌ *Reserva Cancelada*',
    '',
    `📋 Ref: *${booking.reference || '—'}*`,
    `👤 ${booking.guest_name}`,
    `📅 ${booking.checkin_date} → ${booking.checkout_date}`,
    `💰 ${booking.total_price.toFixed(0)}€`,
    '',
    'Checkout expirou — datas libertadas.',
  ].join('\n');
}

export function buildRefundMessage(booking: {
  reference?: string;
  guest_name: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
}, refundAmount: number): string {
  return [
    '💸 *Reembolso Processado*',
    '',
    `📋 Ref: *${booking.reference || '—'}*`,
    `👤 ${booking.guest_name}`,
    `📅 ${booking.checkin_date} → ${booking.checkout_date}`,
    `💰 Reembolsado: *${refundAmount.toFixed(0)}€* de ${booking.total_price.toFixed(0)}€`,
    '',
    '🔓 Datas libertadas no calendário.',
  ].join('\n');
}

export function buildGuestSuggestionMessage(s: {
  guest_name: string | null;
  rating: number | null;
  message: string;
  reference?: string | null;
  checkin_date?: string | null;
  checkout_date?: string | null;
}): string {
  const stars = s.rating ? '⭐'.repeat(s.rating) : '';
  const stay =
    s.checkin_date && s.checkout_date
      ? `${s.checkin_date} → ${s.checkout_date}`
      : '';
  // Telegram Markdown does not love asterisks/underscores in user content,
  // so we keep the body plain.
  const body = s.message.length > 800 ? s.message.slice(0, 800) + '…' : s.message;
  return [
    '💬 *Nova sugestão de hóspede*',
    '',
    `👤 ${s.guest_name || 'Sem nome'}`,
    s.reference ? `🏷 ${s.reference}` : '',
    stay ? `📅 ${stay}` : '',
    stars ? `${stars} (${s.rating}/5)` : '',
    '',
    body,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildGuestReviewMessage(r: {
  guest_name: string | null;
  stars: number;
  comment: string;
  checkin_date?: string | null;
  checkout_date?: string | null;
}): string {
  const stay = r.checkin_date && r.checkout_date ? `${r.checkin_date} → ${r.checkout_date}` : '';
  const body = r.comment.length > 800 ? r.comment.slice(0, 800) + '…' : r.comment;
  return [
    '⭐ *Nova avaliação no site*',
    '',
    `👤 ${r.guest_name || 'Sem nome'}`,
    stay ? `📅 ${stay}` : '',
    `${'⭐'.repeat(r.stars)} (${r.stars}/5)`,
    '',
    body,
    '',
    'Fica escondida até a aprovares em /admin/reviews.',
  ]
    .filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''))
    .join('\n');
}
