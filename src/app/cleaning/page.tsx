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
  const { data } = await supabase
    .from('cleaning_tasks')
    .select('*')
    .is('linked_to_booking_id', null)
    .gte('cleaning_date', fromStr)
    .order('cleaning_date', { ascending: true });
  return (data || []) as CleaningTask[];
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
