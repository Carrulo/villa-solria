import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { name, email, phone, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Try Resend email first
    let emailSent = false;
    try {
      const { data: settingsData } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['resend_api_key', 'email_contact_email']);

      const settings: Record<string, string> = {};
      (settingsData || []).forEach((row: { key: string; value: unknown }) => {
        settings[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
      });

      const resendKey = settings.resend_api_key;
      const toEmail = settings.email_contact_email || 'bruno@kontrolsat.com';

      if (resendKey) {
        const { Resend } = await import('resend');
        const resend = new Resend(resendKey);

        await resend.emails.send({
          from: 'Villa Solria <onboarding@resend.dev>',
          to: toEmail,
          subject: `[Villa Solria] Contact from ${name}`,
          html: `
            <h2>New Contact Message</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
          `,
          replyTo: email,
        });

        emailSent = true;
      }
    } catch (err) {
      console.error('Resend email error:', err);
    }

    // Also insert into contact_messages table (graceful degradation)
    try {
      await supabase.from('contact_messages').insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        message: message.trim(),
        email_sent: emailSent,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      // 42P01 = table doesn't exist yet — that's fine
      const pgError = err as { code?: string };
      if (pgError.code !== '42P01') {
        console.error('Contact message insert error:', err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact API error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
