import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Seasons fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch seasons' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Seasons API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
