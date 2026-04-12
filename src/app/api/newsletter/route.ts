import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const { email, locale } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const supabase = createServerClient();

    // Try to insert into the newsletter table.
    // If the table doesn't exist yet, we catch the error and still return
    // success so the front-end UX works before the table is created.
    const { error } = await supabase.from('newsletter').insert({
      email: email.toLowerCase().trim(),
      locale: locale || 'en',
      subscribed_at: new Date().toISOString(),
    });

    if (error) {
      // 42P01 = relation does not exist (table not created yet)
      // 23505 = unique violation (duplicate email — treat as success)
      if (error.code === '42P01' || error.code === '23505') {
        return NextResponse.json({ success: true });
      }
      console.error('Newsletter insert error:', error);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Newsletter API error:', err);
    return NextResponse.json({ success: true });
  }
}
