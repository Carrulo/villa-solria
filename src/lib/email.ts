import { Resend } from 'resend';
import { createServerClient } from './supabase-server';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BookingEmailData {
  reference: string;
  guest_name: string;
  guest_email: string;
  checkin_date: string;
  checkout_date: string;
  num_nights: number;
  num_guests: number;
  total_price: number;
  language?: string;
  stripe_receipt_url?: string | null;
}

export interface AbandonmentEmailData {
  guest_name: string;
  guest_email: string;
  checkin_date: string;
  checkout_date: string;
  num_nights: number;
  total_price: number;
  language?: string;
}

type SupportedLocale = 'pt' | 'en' | 'es' | 'de';

/* ------------------------------------------------------------------ */
/*  i18n strings for the email                                        */
/* ------------------------------------------------------------------ */

const emailStrings: Record<
  SupportedLocale,
  {
    subject: string;
    greeting: (name: string) => string;
    intro: string;
    refLabel: string;
    checkinLabel: string;
    checkoutLabel: string;
    nightsLabel: string;
    guestsLabel: string;
    totalLabel: string;
    checkinTime: string;
    checkoutTime: string;
    addressLabel: string;
    importantTitle: string;
    lockCode: string;
    cancellationTitle: string;
    cancellationText: string;
    contactTitle: string;
    contactText: string;
    footer: string;
    nightsUnit: (n: number) => string;
    guestsUnit: (n: number) => string;
    receiptLink: string;
  }
> = {
  pt: {
    subject: 'Reserva Confirmada - Villa Solria',
    greeting: (name) => `Ola ${name},`,
    intro: 'A sua reserva na Villa Solria foi confirmada com sucesso! Aqui estao os detalhes:',
    refLabel: 'Referencia',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    nightsLabel: 'Noites',
    guestsLabel: 'Hospedes',
    totalLabel: 'Total Pago',
    checkinTime: 'A partir das 16:00',
    checkoutTime: 'Ate as 11:00',
    addressLabel: 'Morada',
    importantTitle: 'Informacoes Importantes',
    lockCode: 'Recebera o codigo da fechadura inteligente por email antes da sua chegada.',
    cancellationTitle: 'Politica de Cancelamento',
    cancellationText: 'Cancelamento gratuito ate 14 dias antes do check-in. Apos esse periodo, o valor do deposito nao sera reembolsado.',
    contactTitle: 'Precisa de Ajuda?',
    contactText: 'Estamos disponiveis para qualquer questao.',
    footer: 'Villa Solria - Cabanas de Tavira, Algarve',
    nightsUnit: (n) => `${n} noite${n > 1 ? 's' : ''}`,
    guestsUnit: (n) => `${n} hospede${n > 1 ? 's' : ''}`,
    receiptLink: 'Ver Recibo',
  },
  en: {
    subject: 'Booking Confirmed - Villa Solria',
    greeting: (name) => `Hello ${name},`,
    intro: 'Your booking at Villa Solria has been confirmed! Here are the details:',
    refLabel: 'Reference',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    nightsLabel: 'Nights',
    guestsLabel: 'Guests',
    totalLabel: 'Total Paid',
    checkinTime: 'From 16:00',
    checkoutTime: 'Until 11:00',
    addressLabel: 'Address',
    importantTitle: 'Important Information',
    lockCode: 'You will receive the smart lock code by email before your arrival.',
    cancellationTitle: 'Cancellation Policy',
    cancellationText: 'Free cancellation up to 14 days before check-in. After that, the deposit will not be refunded.',
    contactTitle: 'Need Help?',
    contactText: 'We are available for any questions.',
    footer: 'Villa Solria - Cabanas de Tavira, Algarve',
    nightsUnit: (n) => `${n} night${n > 1 ? 's' : ''}`,
    guestsUnit: (n) => `${n} guest${n > 1 ? 's' : ''}`,
    receiptLink: 'View Receipt',
  },
  es: {
    subject: 'Reserva Confirmada - Villa Solria',
    greeting: (name) => `Hola ${name},`,
    intro: 'Su reserva en Villa Solria ha sido confirmada. Aqui estan los detalles:',
    refLabel: 'Referencia',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    nightsLabel: 'Noches',
    guestsLabel: 'Huespedes',
    totalLabel: 'Total Pagado',
    checkinTime: 'A partir de las 16:00',
    checkoutTime: 'Hasta las 11:00',
    addressLabel: 'Direccion',
    importantTitle: 'Informacion Importante',
    lockCode: 'Recibira el codigo de la cerradura inteligente por email antes de su llegada.',
    cancellationTitle: 'Politica de Cancelacion',
    cancellationText: 'Cancelacion gratuita hasta 14 dias antes del check-in. Despues, el deposito no sera reembolsado.',
    contactTitle: 'Necesita Ayuda?',
    contactText: 'Estamos disponibles para cualquier consulta.',
    footer: 'Villa Solria - Cabanas de Tavira, Algarve',
    nightsUnit: (n) => `${n} noche${n > 1 ? 's' : ''}`,
    guestsUnit: (n) => `${n} huesped${n > 1 ? 'es' : ''}`,
    receiptLink: 'Ver Recibo',
  },
  de: {
    subject: 'Buchung Bestatigt - Villa Solria',
    greeting: (name) => `Hallo ${name},`,
    intro: 'Ihre Buchung in Villa Solria wurde bestatigt! Hier sind die Details:',
    refLabel: 'Referenz',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    nightsLabel: 'Nachte',
    guestsLabel: 'Gaste',
    totalLabel: 'Gesamtbetrag',
    checkinTime: 'Ab 16:00',
    checkoutTime: 'Bis 11:00',
    addressLabel: 'Adresse',
    importantTitle: 'Wichtige Informationen',
    lockCode: 'Sie erhalten den Smart-Lock-Code per E-Mail vor Ihrer Ankunft.',
    cancellationTitle: 'Stornierungsbedingungen',
    cancellationText: 'Kostenlose Stornierung bis 14 Tage vor Check-in. Danach wird die Anzahlung nicht erstattet.',
    contactTitle: 'Brauchen Sie Hilfe?',
    contactText: 'Wir stehen Ihnen fur Fragen zur Verfugung.',
    footer: 'Villa Solria - Cabanas de Tavira, Algarve',
    nightsUnit: (n) => `${n} ${n > 1 ? 'Nachte' : 'Nacht'}`,
    guestsUnit: (n) => `${n} ${n > 1 ? 'Gaste' : 'Gast'}`,
    receiptLink: 'Quittung ansehen',
  },
};

/* ------------------------------------------------------------------ */
/*  i18n strings for the abandonment email                             */
/* ------------------------------------------------------------------ */

const abandonmentStrings: Record<
  SupportedLocale,
  {
    subject: string;
    greeting: (name: string) => string;
    intro: string;
    detailsTitle: string;
    checkinLabel: string;
    checkoutLabel: string;
    nightsLabel: string;
    totalLabel: string;
    nightsUnit: (n: number) => string;
    ctaMessage: string;
    ctaButton: string;
    contactTitle: string;
    contactText: string;
    footer: string;
  }
> = {
  pt: {
    subject: 'Nao concluiu a sua reserva — Villa Solria',
    greeting: (name) => `Ola ${name},`,
    intro: 'Reparamos que nao concluiu a sua reserva na Villa Solria.',
    detailsTitle: 'Detalhes da sua reserva',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    nightsLabel: 'Noites',
    totalLabel: 'Valor Total',
    nightsUnit: (n) => `${n} noite${n > 1 ? 's' : ''}`,
    ctaMessage: 'As suas datas ainda estao disponiveis! Reserve agora antes que sejam ocupadas.',
    ctaButton: 'Completar Reserva',
    contactTitle: 'Precisa de ajuda?',
    contactText: 'Se teve algum problema durante o processo de reserva, nao hesite em contactar-nos.',
    footer: 'Villa Solria - Cabanas de Tavira, Algarve',
  },
  en: {
    subject: 'Your booking was not completed — Villa Solria',
    greeting: (name) => `Hello ${name},`,
    intro: 'We noticed you did not complete your reservation at Villa Solria.',
    detailsTitle: 'Your booking details',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    nightsLabel: 'Nights',
    totalLabel: 'Total Price',
    nightsUnit: (n) => `${n} night${n > 1 ? 's' : ''}`,
    ctaMessage: 'Your dates are still available! Book now before they are taken.',
    ctaButton: 'Complete Booking',
    contactTitle: 'Need help?',
    contactText: 'If you had any issues during the booking process, feel free to contact us.',
    footer: 'Villa Solria - Cabanas de Tavira, Algarve',
  },
  es: {
    subject: 'No completo su reserva — Villa Solria',
    greeting: (name) => `Hola ${name},`,
    intro: 'Hemos notado que no completo su reserva en Villa Solria.',
    detailsTitle: 'Detalles de su reserva',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    nightsLabel: 'Noches',
    totalLabel: 'Precio Total',
    nightsUnit: (n) => `${n} noche${n > 1 ? 's' : ''}`,
    ctaMessage: 'Sus fechas siguen disponibles! Reserve ahora antes de que se agoten.',
    ctaButton: 'Completar Reserva',
    contactTitle: 'Necesita ayuda?',
    contactText: 'Si tuvo algun problema durante el proceso de reserva, no dude en contactarnos.',
    footer: 'Villa Solria - Cabanas de Tavira, Algarve',
  },
  de: {
    subject: 'Ihre Buchung wurde nicht abgeschlossen — Villa Solria',
    greeting: (name) => `Hallo ${name},`,
    intro: 'Wir haben bemerkt, dass Sie Ihre Reservierung bei Villa Solria nicht abgeschlossen haben.',
    detailsTitle: 'Ihre Buchungsdetails',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    nightsLabel: 'Nachte',
    totalLabel: 'Gesamtpreis',
    nightsUnit: (n) => `${n} ${n > 1 ? 'Nachte' : 'Nacht'}`,
    ctaMessage: 'Ihre Termine sind noch verfugbar! Buchen Sie jetzt, bevor sie vergeben sind.',
    ctaButton: 'Buchung abschliessen',
    contactTitle: 'Brauchen Sie Hilfe?',
    contactText: 'Wenn Sie Probleme beim Buchungsprozess hatten, kontaktieren Sie uns gerne.',
    footer: 'Villa Solria - Cabanas de Tavira, Algarve',
  },
};

/* ------------------------------------------------------------------ */
/*  Date formatting                                                    */
/* ------------------------------------------------------------------ */

function formatDate(iso: string, locale: SupportedLocale): string {
  const localeMap: Record<SupportedLocale, string> = {
    pt: 'pt-PT',
    en: 'en-GB',
    es: 'es-ES',
    de: 'de-DE',
  };
  return new Date(iso).toLocaleDateString(localeMap[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  HTML email template                                                */
/* ------------------------------------------------------------------ */

function buildConfirmationEmailHtml(
  data: BookingEmailData,
  locale: SupportedLocale,
  sOverride?: typeof emailStrings[SupportedLocale],
  settings?: Record<string, string>,
): string {
  const s = sOverride || emailStrings[locale];
  const checkinFormatted = formatDate(data.checkin_date, locale);
  const checkoutFormatted = formatDate(data.checkout_date, locale);

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${s.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#2563EB;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Villa Solria</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#93c5fd;font-weight:500;">Cabanas de Tavira, Algarve</p>
            </td>
          </tr>

          <!-- Check icon + title -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px 24px;text-align:center;">
              <div style="width:64px;height:64px;border-radius:50%;background-color:#dcfce7;margin:0 auto 16px;line-height:64px;text-align:center;">
                <span style="font-size:32px;">&#10003;</span>
              </div>
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${s.subject}</h2>
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.5;">${s.greeting(data.guest_name)}<br>${s.intro}</p>
            </td>
          </tr>

          <!-- Reference -->
          <tr>
            <td style="background-color:#ffffff;padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eff6ff;border-radius:12px;border:1px solid #bfdbfe;">
                <tr>
                  <td style="padding:20px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;font-weight:600;">${s.refLabel}</p>
                    <p style="margin:0;font-size:24px;font-weight:700;color:#2563EB;letter-spacing:1px;">${data.reference}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Booking details grid -->
          <tr>
            <td style="background-color:#ffffff;padding:24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;width:50%;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.checkinLabel}</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${checkinFormatted}</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#2563EB;font-weight:500;">${s.checkinTime}</p>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;border-left:1px solid #e5e7eb;width:50%;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.checkoutLabel}</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${checkoutFormatted}</p>
                    <p style="margin:2px 0 0;font-size:13px;color:#2563EB;font-weight:500;">${s.checkoutTime}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.nightsLabel}</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${s.nightsUnit(data.num_nights)}</p>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;border-left:1px solid #e5e7eb;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.guestsLabel}</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${s.guestsUnit(data.num_guests)}</p>
                  </td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:16px 20px;background-color:#f9fafb;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.totalLabel}</p>
                        </td>
                        <td style="text-align:right;">
                          <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">${data.total_price.toFixed(2)} &euro;</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Receipt link -->
          ${data.stripe_receipt_url ? `
          <tr>
            <td style="background-color:#ffffff;padding:0 40px 16px;text-align:center;">
              <a href="${data.stripe_receipt_url}" target="_blank" style="display:inline-block;padding:10px 24px;background-color:#2563EB;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">${s.receiptLink}</a>
            </td>
          </tr>` : ''}

          <!-- Address -->
          <tr>
            <td style="background-color:#ffffff;padding:8px 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.addressLabel}</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:500;">${settings?.['email_property_address'] || 'Rua do Junco 3.5B'}</p>
                    <p style="margin:2px 0 0;font-size:14px;color:#6b7280;">8800-591 Cabanas de Tavira, Portugal</p>
                    <p style="margin:8px 0 0;">
                      <a href="https://maps.google.com/?q=37.1317,-7.6100" target="_blank" style="font-size:13px;color:#2563EB;text-decoration:none;font-weight:500;">Google Maps &rarr;</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Important info -->
          <tr>
            <td style="background-color:#ffffff;padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fefce8;border-radius:12px;border:1px solid #fde68a;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#92400e;">${s.importantTitle}</p>
                    <p style="margin:0 0 12px;font-size:14px;color:#78350f;line-height:1.5;">${s.lockCode}</p>
                    <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#92400e;">${s.cancellationTitle}</p>
                    <p style="margin:0;font-size:13px;color:#78350f;line-height:1.5;">${s.cancellationText}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="background-color:#ffffff;padding:0 40px 32px;border-radius:0 0 16px 16px;">
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">${s.contactTitle}</p>
              <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">${s.contactText}</p>
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;">
                    <a href="https://wa.me/${(settings?.['email_contact_whatsapp'] || '351960486962').replace(/[^\d]/g, '')}" target="_blank" style="display:inline-block;padding:8px 16px;background-color:#25D366;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">WhatsApp</a>
                  </td>
                  <td>
                    <a href="mailto:${settings?.['email_contact_email'] || 'reservas@villasolria.com'}" style="display:inline-block;padding:8px 16px;background-color:#e5e7eb;color:#374151;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Email</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${s.footer}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Generate booking reference VS-YYYY-XXXX                           */
/* ------------------------------------------------------------------ */

export async function generateBookingReference(): Promise<string> {
  const supabase = createServerClient();
  const year = new Date().getFullYear();

  // Count confirmed bookings to generate sequential number
  const { count } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'confirmed');

  const seq = ((count ?? 0) + 1).toString().padStart(4, '0');
  return `VS-${year}-${seq}`;
}

/* ------------------------------------------------------------------ */
/*  Send confirmation email                                           */
/* ------------------------------------------------------------------ */

export async function sendBookingConfirmationEmail(
  data: BookingEmailData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  // Read ALL email settings from settings table
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [
      'resend_api_key',
      'email_from_address',
      'email_subject_confirmed',
      'email_welcome_message',
      'email_smartlock_note',
      'email_cancellation_text',
      'email_checkin_time',
      'email_checkout_time',
      'email_contact_whatsapp',
      'email_contact_email',
      'email_property_address',
    ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
  }

  const apiKey = settings['resend_api_key'];
  if (!apiKey) {
    console.warn('[email] Resend API key not configured — skipping confirmation email');
    return { success: false, error: 'Resend API key not configured' };
  }

  const fromAddress = settings['email_from_address'] || 'Villa Solria <reservas@villasolria.com>';
  const rawLang = (data.language ?? 'pt').toLowerCase() as SupportedLocale;
  const locale: SupportedLocale = rawLang in emailStrings ? rawLang : 'en';

  // Override locale strings with admin-configured values — PT only
  // Other languages (EN/ES/DE) keep their built-in translations
  const s = { ...emailStrings[locale] };
  if (locale === 'pt') {
    if (settings['email_welcome_message']) s.intro = settings['email_welcome_message'];
    if (settings['email_smartlock_note']) s.lockCode = settings['email_smartlock_note'];
    if (settings['email_cancellation_text']) s.cancellationText = settings['email_cancellation_text'];
    if (settings['email_checkin_time']) s.checkinTime = settings['email_checkin_time'];
    if (settings['email_checkout_time']) s.checkoutTime = settings['email_checkout_time'];
  }

  const defaultSubject = emailStrings[locale].subject;
  const subject = settings['email_subject_confirmed'] || defaultSubject;

  const html = buildConfirmationEmailHtml(data, locale, s, settings);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromAddress,
      to: data.guest_email,
      subject,
      html,
    });

    console.log(`[email] Confirmation email sent to ${data.guest_email} for booking ${data.reference}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[email] Failed to send confirmation email:`, message);
    return { success: false, error: message };
  }
}

/* ------------------------------------------------------------------ */
/*  HTML abandonment email template                                    */
/* ------------------------------------------------------------------ */

function buildAbandonmentEmailHtml(
  data: AbandonmentEmailData,
  locale: SupportedLocale,
  settings: Record<string, string>,
): string {
  const s = abandonmentStrings[locale];
  const checkinFormatted = formatDate(data.checkin_date, locale);
  const checkoutFormatted = formatDate(data.checkout_date, locale);
  const whatsappNumber = (settings['email_contact_whatsapp'] || '351960486962').replace(/[^\d]/g, '');
  const contactEmail = settings['email_contact_email'] || 'reservas@villasolria.com';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${s.subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header (amber/orange accent) -->
          <tr>
            <td style="background-color:#D97706;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Villa Solria</h1>
              <p style="margin:8px 0 0;font-size:14px;color:#fde68a;font-weight:500;">Cabanas de Tavira, Algarve</p>
            </td>
          </tr>

          <!-- Icon + intro -->
          <tr>
            <td style="background-color:#ffffff;padding:32px 40px 24px;text-align:center;">
              <div style="width:64px;height:64px;border-radius:50%;background-color:#fef3c7;margin:0 auto 16px;line-height:64px;text-align:center;">
                <span style="font-size:32px;">&#9201;</span>
              </div>
              <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.6;">${s.greeting(data.guest_name)}<br>${s.intro}</p>
            </td>
          </tr>

          <!-- Booking details card -->
          <tr>
            <td style="background-color:#ffffff;padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                <tr>
                  <td colspan="2" style="padding:12px 20px;background-color:#fffbeb;border-bottom:1px solid #fde68a;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">${s.detailsTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;width:50%;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.checkinLabel}</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${checkinFormatted}</p>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;border-left:1px solid #e5e7eb;width:50%;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.checkoutLabel}</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${checkoutFormatted}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.nightsLabel}</p>
                    <p style="margin:0;font-size:15px;color:#111827;font-weight:600;">${s.nightsUnit(data.num_nights)}</p>
                  </td>
                  <td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;border-left:1px solid #e5e7eb;">
                    <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">${s.totalLabel}</p>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#111827;">${data.total_price.toFixed(2)} &euro;</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA section -->
          <tr>
            <td style="background-color:#ffffff;padding:0 40px 32px;text-align:center;">
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">${s.ctaMessage}</p>
              <a href="https://villasolria.com/pricing" target="_blank" style="display:inline-block;padding:14px 40px;background-color:#D97706;color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.3px;">${s.ctaButton}</a>
            </td>
          </tr>

          <!-- Contact -->
          <tr>
            <td style="background-color:#ffffff;padding:0 40px 32px;border-radius:0 0 16px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:12px;border:1px solid #e5e7eb;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">${s.contactTitle}</p>
                    <p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.5;">${s.contactText}</p>
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:12px;">
                          <a href="https://wa.me/${whatsappNumber}" target="_blank" style="display:inline-block;padding:8px 16px;background-color:#25D366;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">WhatsApp</a>
                        </td>
                        <td>
                          <a href="mailto:${contactEmail}" style="display:inline-block;padding:8px 16px;background-color:#e5e7eb;color:#374151;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Email</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">${s.footer}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Send abandonment email                                             */
/* ------------------------------------------------------------------ */

export async function sendAbandonmentEmail(
  data: AbandonmentEmailData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  // Read email settings
  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', [
      'resend_api_key',
      'email_from_address',
      'email_contact_whatsapp',
      'email_contact_email',
      'email_abandonment_enabled',
    ]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
  }

  // Check if abandonment emails are enabled (default: true)
  const enabled = settings['email_abandonment_enabled'] !== 'false';
  if (!enabled) {
    console.log('[email] Abandonment emails disabled — skipping');
    return { success: false, error: 'Abandonment emails disabled' };
  }

  const apiKey = settings['resend_api_key'];
  if (!apiKey) {
    console.warn('[email] Resend API key not configured — skipping abandonment email');
    return { success: false, error: 'Resend API key not configured' };
  }

  const fromAddress = settings['email_from_address'] || 'Villa Solria <reservas@villasolria.com>';
  const rawLang = (data.language ?? 'pt').toLowerCase() as SupportedLocale;
  const locale: SupportedLocale = rawLang in abandonmentStrings ? rawLang : 'en';
  const subject = abandonmentStrings[locale].subject;
  const html = buildAbandonmentEmailHtml(data, locale, settings);

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: fromAddress,
      to: data.guest_email,
      subject,
      html,
    });

    console.log(`[email] Abandonment email sent to ${data.guest_email}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[email] Failed to send abandonment email:`, message);
    return { success: false, error: message };
  }
}

/* ------------------------------------------------------------------ */
/*  Refund confirmation email                                          */
/* ------------------------------------------------------------------ */

export interface RefundEmailData {
  reference: string;
  guest_name: string;
  guest_email: string;
  checkin_date: string;
  checkout_date: string;
  total_price: number;
  refund_amount: number;
  language?: string;
}

const refundStrings: Record<SupportedLocale, {
  subject: string;
  greeting: (name: string) => string;
  intro: string;
  refLabel: string;
  datesLabel: string;
  refundedLabel: string;
  note: string;
  contactTitle: string;
  contactText: string;
}> = {
  pt: {
    subject: 'Reembolso Processado — Villa Solria',
    greeting: (name) => `Olá ${name},`,
    intro: 'O reembolso da sua reserva na Villa Solria foi processado com sucesso.',
    refLabel: 'Referência',
    datesLabel: 'Datas da reserva',
    refundedLabel: 'Valor reembolsado',
    note: 'O valor será creditado na sua conta dentro de 5 a 10 dias úteis, dependendo do seu banco.',
    contactTitle: 'Questões?',
    contactText: 'Estamos disponíveis para qualquer esclarecimento.',
  },
  en: {
    subject: 'Refund Processed — Villa Solria',
    greeting: (name) => `Hello ${name},`,
    intro: 'The refund for your Villa Solria booking has been processed successfully.',
    refLabel: 'Reference',
    datesLabel: 'Booking dates',
    refundedLabel: 'Amount refunded',
    note: 'The amount will be credited to your account within 5 to 10 business days, depending on your bank.',
    contactTitle: 'Questions?',
    contactText: 'We are available for any questions.',
  },
  es: {
    subject: 'Reembolso Procesado — Villa Solria',
    greeting: (name) => `Hola ${name},`,
    intro: 'El reembolso de su reserva en Villa Solria ha sido procesado correctamente.',
    refLabel: 'Referencia',
    datesLabel: 'Fechas de la reserva',
    refundedLabel: 'Importe reembolsado',
    note: 'El importe se acreditará en su cuenta en un plazo de 5 a 10 días hábiles, dependiendo de su banco.',
    contactTitle: '¿Preguntas?',
    contactText: 'Estamos disponibles para cualquier consulta.',
  },
  de: {
    subject: 'Rückerstattung Verarbeitet — Villa Solria',
    greeting: (name) => `Hallo ${name},`,
    intro: 'Die Rückerstattung Ihrer Villa Solria-Buchung wurde erfolgreich verarbeitet.',
    refLabel: 'Referenz',
    datesLabel: 'Buchungsdaten',
    refundedLabel: 'Erstatteter Betrag',
    note: 'Der Betrag wird innerhalb von 5 bis 10 Werktagen Ihrem Konto gutgeschrieben, abhängig von Ihrer Bank.',
    contactTitle: 'Fragen?',
    contactText: 'Wir stehen Ihnen für Fragen zur Verfügung.',
  },
};

export async function sendRefundEmail(
  data: RefundEmailData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['resend_api_key', 'email_from_address', 'email_contact_whatsapp', 'email_contact_email']);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
  }

  const apiKey = settings['resend_api_key'];
  if (!apiKey) return { success: false, error: 'Resend API key not configured' };

  const fromAddress = settings['email_from_address'] || 'Villa Solria <reservas@villasolria.com>';
  const rawLang = (data.language ?? 'pt').toLowerCase() as SupportedLocale;
  const locale: SupportedLocale = rawLang in refundStrings ? rawLang : 'en';
  const s = refundStrings[locale];

  const whatsapp = (settings['email_contact_whatsapp'] || '351960486962').replace(/[^\d]/g, '');
  const contactEmail = settings['email_contact_email'] || 'reservas@villasolria.com';

  const checkinFormatted = formatDate(data.checkin_date, locale);
  const checkoutFormatted = formatDate(data.checkout_date, locale);

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr><td align="center" style="padding:40px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background-color:#7C3AED;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
          <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;">Villa Solria</h1>
          <p style="margin:8px 0 0;font-size:14px;color:#c4b5fd;">Cabanas de Tavira, Algarve</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:32px 40px 24px;text-align:center;">
          <div style="width:64px;height:64px;border-radius:50%;background-color:#ede9fe;margin:0 auto 16px;line-height:64px;">
            <span style="font-size:32px;">💸</span>
          </div>
          <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${s.subject}</h2>
          <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.5;">${s.greeting(data.guest_name)}<br>${s.intro}</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 24px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:600;">${s.refLabel}</p>
              <p style="margin:0;font-size:18px;font-weight:700;color:#7C3AED;">${data.reference}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:600;">${s.datesLabel}</p>
              <p style="margin:0;font-size:15px;color:#111827;">${checkinFormatted} → ${checkoutFormatted}</p>
            </td></tr>
            <tr><td style="padding:16px 20px;background-color:#f9fafb;">
              <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;font-weight:600;">${s.refundedLabel}</p>
              <p style="margin:0;font-size:22px;font-weight:700;color:#7C3AED;">${data.refund_amount.toFixed(2)} €</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 24px;">
          <div style="background-color:#ede9fe;border-radius:12px;padding:16px 20px;">
            <p style="margin:0;font-size:14px;color:#5b21b6;line-height:1.5;">ℹ️ ${s.note}</p>
          </div>
        </td></tr>
        <tr><td style="background-color:#ffffff;padding:0 40px 32px;border-radius:0 0 16px 16px;">
          <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:#111827;">${s.contactTitle}</p>
          <p style="margin:0 0 12px;font-size:14px;color:#6b7280;">${s.contactText}</p>
          <a href="https://wa.me/${whatsapp}" style="display:inline-block;padding:8px 16px;background-color:#25D366;color:#ffffff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;margin-right:8px;">WhatsApp</a>
          <a href="mailto:${contactEmail}" style="display:inline-block;padding:8px 16px;background-color:#e5e7eb;color:#374151;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600;">Email</a>
        </td></tr>
        <tr><td style="padding:24px 40px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Villa Solria — Cabanas de Tavira, Algarve</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from: fromAddress, to: data.guest_email, subject: s.subject, html });
    console.log(`[email] Refund email sent to ${data.guest_email}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[email] Failed to send refund email:`, message);
    return { success: false, error: message };
  }
}

/* ------------------------------------------------------------------ */
/*  Review request email — sent ~2 days after checkout                */
/* ------------------------------------------------------------------ */

export interface ReviewEmailData {
  guest_name: string;
  guest_email: string;
  checkin_date: string;
  checkout_date: string;
  language?: string;
}

const reviewStrings: Record<SupportedLocale, {
  subject: string;
  hello: string;
  intro: string;
  ask: string;
  cta: string;
  thanks: string;
  signature: string;
}> = {
  pt: {
    subject: 'Como foi a sua estadia na Villa Solria? 💛',
    hello: 'Olá',
    intro: 'Esperamos que tenha tido uma estadia maravilhosa na Villa Solria.',
    ask: 'Se puder partilhar 2 minutos connosco, uma avaliação no Facebook ajuda outras famílias a descobrir-nos e significa muito para nós.',
    cta: 'Deixar avaliação no Facebook',
    thanks: 'Muito obrigado e esperamos vê-lo em breve!',
    signature: 'Equipa Villa Solria',
  },
  en: {
    subject: 'How was your stay at Villa Solria? 💛',
    hello: 'Hi',
    intro: 'We hope you had a wonderful stay at Villa Solria.',
    ask: 'If you can spare 2 minutes, a review on Facebook helps other families find us and means a lot to us.',
    cta: 'Leave a Facebook review',
    thanks: 'Thank you so much and we hope to see you again soon!',
    signature: 'The Villa Solria team',
  },
  es: {
    subject: '¿Cómo fue su estancia en Villa Solria? 💛',
    hello: 'Hola',
    intro: 'Esperamos que haya tenido una estancia maravillosa en Villa Solria.',
    ask: 'Si puede dedicarnos 2 minutos, una valoración en Facebook ayuda a otras familias a descubrirnos y significa mucho para nosotros.',
    cta: 'Dejar valoración en Facebook',
    thanks: '¡Muchas gracias y esperamos verle pronto!',
    signature: 'Equipo Villa Solria',
  },
  de: {
    subject: 'Wie war Ihr Aufenthalt in der Villa Solria? 💛',
    hello: 'Hallo',
    intro: 'Wir hoffen, Sie hatten einen wunderbaren Aufenthalt in der Villa Solria.',
    ask: 'Wenn Sie 2 Minuten Zeit haben, hilft eine Bewertung auf Facebook anderen Familien, uns zu finden.',
    cta: 'Facebook-Bewertung hinterlassen',
    thanks: 'Vielen Dank und bis zum nächsten Mal!',
    signature: 'Das Villa Solria Team',
  },
};

export async function sendReviewRequestEmail(
  data: ReviewEmailData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServerClient();

  const { data: settingsRows } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['resend_api_key', 'email_from_address', 'review_fb_url']);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
  }

  const apiKey = settings['resend_api_key'];
  if (!apiKey) {
    return { success: false, error: 'Resend API key not configured' };
  }

  const fromAddress = settings['email_from_address'] || 'Villa Solria <reservas@villasolria.com>';
  const reviewUrl = settings['review_fb_url'] || 'https://www.facebook.com/VillaSolria/reviews';
  const rawLang = (data.language ?? 'pt').toLowerCase() as SupportedLocale;
  const locale: SupportedLocale = rawLang in reviewStrings ? rawLang : 'en';
  const s = reviewStrings[locale];
  const firstName = (data.guest_name || '').trim().split(/\s+/)[0] || '';

  const html = `<!DOCTYPE html><html lang="${locale}"><head><meta charset="utf-8"><title>${s.subject}</title></head>
  <body style="margin:0;padding:0;background:#f6f6f4;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;padding:24px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.04);">
          <tr><td style="padding:32px 32px 16px 32px;">
            <h1 style="margin:0 0 16px;font-size:22px;color:#1c1c1c;">${s.hello}${firstName ? ' ' + firstName : ''},</h1>
            <p style="margin:0 0 12px;font-size:15px;line-height:1.55;color:#333;">${s.intro}</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.55;color:#333;">${s.ask}</p>
            <p style="margin:0 0 28px;text-align:center;">
              <a href="${reviewUrl}" style="display:inline-block;padding:14px 28px;background:#1877f2;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">${s.cta}</a>
            </p>
            <p style="margin:0 0 4px;font-size:15px;line-height:1.55;color:#333;">${s.thanks}</p>
            <p style="margin:0;font-size:15px;color:#666;">${s.signature}</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({ from: fromAddress, to: data.guest_email, subject: s.subject, html });
    console.log(`[email] Review request sent to ${data.guest_email}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[email] Failed to send review email:`, message);
    return { success: false, error: message };
  }
}
