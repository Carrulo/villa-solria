import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const { subject, html, locale_filter } = await request.json();

    if (!subject || !html) {
      return NextResponse.json(
        { error: 'Subject and html are required' },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Fetch settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['resend_api_key', 'email_from_address']);

    const settings: Record<string, string> = {};
    (settingsData || []).forEach((row: { key: string; value: unknown }) => {
      settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    });

    const resendKey = settings.resend_api_key;
    const fromAddress = settings.email_from_address || 'Villa Solria <onboarding@resend.dev>';

    if (!resendKey) {
      return NextResponse.json(
        { error: 'Resend API key not configured. Go to Settings to add it.' },
        { status: 400 },
      );
    }

    // Fetch subscribers
    let query = supabase.from('newsletter').select('id, email, locale');

    if (locale_filter) {
      query = query.eq('locale', locale_filter.toLowerCase());
    }

    const { data: subscribers, error: subError } = await query;

    if (subError) {
      console.error('Newsletter subscribers query error:', subError);
      return NextResponse.json(
        { error: 'Error fetching subscribers' },
        { status: 500 },
      );
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No subscribers found for the selected filter' },
        { status: 400 },
      );
    }

    // Build branded HTML email
    const brandedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background-color:#2563EB;padding:32px 40px;border-radius:16px 16px 0 0;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:0.5px;">Villa Solria</h1>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px;">Cabanas de Tavira, Algarve</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
              <div style="color:#1f2937;font-size:15px;line-height:1.7;">
                ${html}
              </div>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
              <p style="color:#9ca3af;font-size:12px;line-height:1.6;margin:0;text-align:center;">
                Villa Solria &mdash; Cabanas de Tavira, Algarve, Portugal<br>
                <a href="https://villasolria.com" style="color:#2563EB;text-decoration:none;">villasolria.com</a>
              </p>
              <p style="color:#d1d5db;font-size:11px;line-height:1.5;margin:16px 0 0;text-align:center;">
                Recebeu este email porque se inscreveu na newsletter da Villa Solria.<br>
                Para deixar de receber, responda a este email com &quot;Cancelar subscricao&quot;.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

    // Send emails via Resend
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);

    let sentCount = 0;
    const errors: string[] = [];

    // Send in batches of 10 to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < subscribers.length; i += batchSize) {
      const batch = subscribers.slice(i, i + batchSize);

      const promises = batch.map(async (sub: { email: string }) => {
        try {
          await resend.emails.send({
            from: fromAddress,
            to: sub.email,
            subject,
            html: brandedHtml,
          });
          sentCount++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          errors.push(`${sub.email}: ${errMsg}`);
          console.error(`Newsletter send error for ${sub.email}:`, err);
        }
      });

      await Promise.all(promises);

      // Small delay between batches
      if (i + batchSize < subscribers.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    return NextResponse.json({
      success: true,
      sent: sentCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error('Newsletter send API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
