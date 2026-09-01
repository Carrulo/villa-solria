// Click-to-chat links. The host sends from his own WhatsApp — no Meta
// Business account, no approved templates, no second phone number.

/** Strips everything but digits; wa.me wants the number without "+". */
export function sanitizeWhatsAppNumber(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Builds a wa.me link that opens the chat with `phone` and the message
 * pre-typed. Returns null when there's no usable number, so callers can
 * disable the button instead of opening a broken link.
 */
export function whatsAppLink(phone: string | null | undefined, text: string): string | null {
  const digits = sanitizeWhatsAppNumber(phone || '');
  if (digits.length < 9) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
