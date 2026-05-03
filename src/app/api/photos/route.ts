import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// Same priority order used by the admin "Auto-organize" button.
// Categories higher up appear first in the public gallery regardless
// of raw sort_order in the DB.
const CATEGORY_ORDER = [
  'hero', 'view', 'living', 'dining', 'kitchen', 'bedroom',
  'bathroom', 'outdoor', 'area', 'general',
];

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('is_visible', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Photos fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    type P = {
      category: string;
      is_hero?: boolean;
      sort_order: number;
      room_label?: string | null;
    };
    const sorted = ((data || []) as P[]).slice().sort((a, b) => {
      if (a.is_hero && !b.is_hero) return -1;
      if (b.is_hero && !a.is_hero) return 1;
      const pa = CATEGORY_ORDER.indexOf(a.category);
      const pb = CATEGORY_ORDER.indexOf(b.category);
      const sa = pa === -1 ? 999 : pa;
      const sb = pb === -1 ? 999 : pb;
      if (sa !== sb) return sa - sb;
      if (a.category === 'bedroom' && b.category === 'bedroom') {
        const ra = a.room_label || 'zzz';
        const rb = b.room_label || 'zzz';
        if (ra !== rb) return ra.localeCompare(rb);
      }
      return a.sort_order - b.sort_order;
    });

    return NextResponse.json(sorted);
  } catch (err) {
    console.error('Photos API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
