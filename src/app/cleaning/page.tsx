import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import type { CleaningTask } from '@/lib/supabase';
import CleaningClient from './cleaning-client';

export const dynamic = 'force-dynamic';

async function getExpectedToken(): Promise<string | null> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'cleaner_token')
    .maybeSingle();
  const value = typeof data?.value === 'string' ? data.value.trim() : '';
  return value || null;
}

async function getTasks(): Promise<CleaningTask[]> {
  const supabase = createServerClient();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const fromDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fromStr = fromDate.toISOString().slice(0, 10);
  const [headsRes, linkedRes] = await Promise.all([
    supabase
      .from('cleaning_tasks')
      .select('*')
      .is('linked_to_booking_id', null)
      .is('linked_to_external_ref', null)
      .gte('cleaning_date', fromStr)
      .order('cleaning_date', { ascending: true }),
    // Children of grouped externals — used to extend a head's
    // displayed stay range to cover the whole grouped stay.
    supabase
      .from('cleaning_tasks')
      .select('linked_to_external_source, linked_to_external_ref, checkin_date, stay_checkout_date')
      .not('linked_to_external_ref', 'is', null),
  ]);
  const heads = (headsRes.data || []) as CleaningTask[];
  const linked = (linkedRes.data || []) as Array<{
    linked_to_external_source: string | null;
    linked_to_external_ref: string | null;
    checkin_date: string | null;
    stay_checkout_date: string | null;
  }>;
  const childrenByHead = new Map<string, typeof linked>();
  for (const c of linked) {
    if (!c.linked_to_external_source || !c.linked_to_external_ref) continue;
    const key = `${c.linked_to_external_source}|${c.linked_to_external_ref}`;
    const arr = childrenByHead.get(key) || [];
    arr.push(c);
    childrenByHead.set(key, arr);
  }
  return heads.map((t) => {
    if (!t.external_source || !t.external_ref) return t;
    const children = childrenByHead.get(`${t.external_source}|${t.external_ref}`);
    if (!children || children.length === 0) return t;
    let maxCo = t.stay_checkout_date || '';
    let minCi = t.checkin_date || '';
    for (const c of children) {
      if (c.stay_checkout_date && c.stay_checkout_date > maxCo) maxCo = c.stay_checkout_date;
      if (c.checkin_date && (!minCi || c.checkin_date < minCi)) minCi = c.checkin_date;
    }
    return { ...t, stay_checkout_date: maxCo, checkin_date: minCi };
  });
}

export default async function CleaningDashboard({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const expected = await getExpectedToken();

  if (!expected || !token || token !== expected) {
    redirect('/');
  }

  const tasks = await getTasks();

  return (
    <Suspense fallback={<div className="p-8 text-gray-400">A carregar...</div>}>
      <CleaningClient initialTasks={tasks} token={token} />
    </Suspense>
  );
}
