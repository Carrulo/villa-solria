// Server-side gate for admin API routes.
//
// Until 2026-10-03 the admin's login lived only in the browser
// (src/app/admin/layout.tsx is a client component) and every route under
// /api trusted whoever called it with the service role behind it. Anyone
// with a booking id could trigger a full Stripe refund, create confirmed
// bookings that block the calendar on every channel, or send arbitrary
// HTML from reservas@villasolria.com.
//
// The browser now sends the Supabase session as a bearer token
// (src/lib/admin-fetch.ts) and each admin route starts with:
//
//   const denied = await requireAdmin(request);
//   if (denied) return denied;

import { NextResponse } from 'next/server';
import { createServerClient } from './supabase-server';

export async function requireAdmin(request: Request): Promise<NextResponse | null> {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
  }

  // Same rule as the RLS policies: any signed-in user who is not a cleaner.
  const { data: cleaner } = await supabase
    .from('cleaner_accounts')
    .select('auth_user_id')
    .eq('auth_user_id', data.user.id)
    .eq('active', true)
    .maybeSingle();
  if (cleaner) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  return null;
}
