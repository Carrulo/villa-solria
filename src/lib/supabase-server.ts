import { createClient } from '@supabase/supabase-js';

export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Prefer service role key on the server so we can bypass RLS for trusted
  // operations (booking inserts, iCal sync writes, etc.). Fall back to the
  // anon key if the service key is not configured.
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
