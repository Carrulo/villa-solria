import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { to_email, subject, body, message_id } = await request.json();

    if (!to_email || !subject || !body) {
      return NextResponse.json(
        { error: 'to_email, subject, and body are required' },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Get Resend config from settings
    const { data: settingsData } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['resend_api_key', 'email_from_address']);

    const settings: Record<string, string> = {};
    (settingsData || []).forEach((row: { key: string; value: unknown }) => {
      settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    });

    const resendKey = settings.resend_api_key;
    if (!resendKey) {
      return NextResponse.json(
        { error: 'Resend API key not configured in settings' },
        { status: 500 },
      );
    }

    const fromAddress = settings.email_from_address || 'Villa Solria <reservas@villasolria.com>';

    // Send email via Resend
    const { Resend } = await import('resend');
    const resend = new Resend(resendKey);

    // Convert plain text to HTML paragraphs
    const htmlBody = body
      .split('\n')
      .map((line: string) => (line.trim() ? `<p>${line}</p>` : '<br>'))
      .join('');

    await resend.emails.send({
      from: fromAddress,
      to: to_email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${htmlBody}
          <br>
          <p style="color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 12px; margin-top: 24px;">
            Villa Solria - Cabanas de Tavira, Algarve<br>
            villasolria.com
          </p>
        </div>
      `,
    });

    // Update contact_messages status to 'replied' if message_id provided
    if (message_id) {
      try {
        await supabase
          .from('contact_messages')
          .update({ status: 'replied' })
          .eq('id', message_id);
      } catch {
        // status column might not exist yet -- ignore gracefully
        console.warn('Could not update message status (column may not exist)');
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Inbox reply error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
