import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('visible', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Reviews fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Reviews API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
