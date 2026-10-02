'use client';

import { supabase } from './supabase';

/**
 * fetch() for admin API routes: attaches the signed-in Supabase session
 * so the route can check it with requireAdmin(). Without the header the
 * route answers 401.
 */
export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);
  if (data.session?.access_token) {
    headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  return fetch(input, { ...init, headers });
}
