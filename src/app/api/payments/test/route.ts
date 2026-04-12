import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = createServerClient();

    // Try to get key from settings first, then env var
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'stripe_secret_key')
      .single();

    const secretKey = (data?.value as string) || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      return NextResponse.json({ error: 'Chave secreta não configurada' }, { status: 400 });
    }

    const stripe = new Stripe(secretKey);
    const account = await stripe.accounts.retrieve('self');

    const mode = secretKey.startsWith('sk_live') ? 'live' : 'test';

    return NextResponse.json({
      ok: true,
      mode,
      country: account.country,
      currency: account.default_currency,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: `Falha: ${message}` }, { status: 500 });
  }
}
