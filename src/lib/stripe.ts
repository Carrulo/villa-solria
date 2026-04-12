import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

let _stripe: Stripe | null = null;
let _lastKey: string | null = null;

/**
 * Get Stripe client, preferring the key stored in the settings table
 * (editable via admin) and falling back to the STRIPE_SECRET_KEY env var.
 * Caches the instance and recreates it if the key changes.
 */
export async function getStripeFromSettings(): Promise<Stripe> {
  let key: string | undefined;

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const svc =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const sb = createClient(url, svc, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await sb
      .from('settings')
      .select('value')
      .eq('key', 'stripe_secret_key')
      .single();
    if (data?.value && typeof data.value === 'string' && data.value.startsWith('sk_')) {
      key = data.value;
    }
  } catch {
    /* settings unavailable — fall through */
  }

  if (!key) {
    key = process.env.STRIPE_SECRET_KEY;
  }

  if (!key) throw new Error('Stripe secret key not configured');

  // Reuse cached instance if key unchanged
  if (_stripe && _lastKey === key) return _stripe;

  _stripe = new Stripe(key);
  _lastKey = key;
  return _stripe;
}

/** Synchronous getter using only env var (for cold start / build time) */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY not set');
    _stripe = new Stripe(key);
    _lastKey = key;
  }
  return _stripe;
}
