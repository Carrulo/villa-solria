import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['ga4_measurement_id', 'meta_pixel_id']);

    if (error) {
      return NextResponse.json({ ga4_measurement_id: '', meta_pixel_id: '' });
    }

    const result: Record<string, string> = {
      ga4_measurement_id: '',
      meta_pixel_id: '',
    };

    (data || []).forEach((row: { key: string; value: unknown }) => {
      result[row.key] = typeof row.value === 'string' ? row.value : String(row.value ?? '');
    });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch {
    return NextResponse.json({ ga4_measurement_id: '', meta_pixel_id: '' });
  }
}
