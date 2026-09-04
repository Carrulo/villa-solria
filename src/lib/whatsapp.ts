// Click-to-chat links. The host sends from his own WhatsApp — no Meta
// Business account, no approved templates, no second phone number.

/** Strips everything but digits; the deeplink wants the number without "+". */
export function sanitizeWhatsAppNumber(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

/**
 * Builds a click-to-chat link that opens the chat with `phone` and the
 * message pre-typed. Returns null when there's no usable number, so
 * callers can disable the button instead of opening a broken link.
 *
 * Uses api.whatsapp.com/send, not wa.me. wa.me bounces through
 * web.whatsapp.com, which on desktop Chrome sometimes decodes the text
 * twice and destroys every multi-byte emoji — 🧹 ⏱ 🛏 🧺 all arrived as
 * "�" in the cleaner's chat while plain accents survived. The same fix
 * was already applied to the guest-guide message in /admin/bookings.
 */
export function whatsAppLink(phone: string | null | undefined, text: string): string | null {
  const digits = sanitizeWhatsAppNumber(phone || '');
  if (digits.length < 9) return null;
  return `https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(text)}`;
}
