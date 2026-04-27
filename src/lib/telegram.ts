import { createServerClient } from './supabase-server';

/**
 * Send a Telegram notification to the property owner.
 * Reads bot token and chat ID from settings table, with env var fallback.
 * Silently fails — notifications are never critical.
 */
export async function sendTelegramNotification(message: string): Promise<void> {
  try {
    const supabase = createServerClient();
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
      console.warn('[telegram] Bot token or chat ID not configured — skipping notification');
      return;
    }

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        parse_mode: 'Markdown',
        text: message,
      }),
    });
  } catch (err) {
    console.error('[telegram] Failed to send notification:', err);
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
