import { fetchGa4Snapshot } from '@/lib/ga4';
import { Eye } from 'lucide-react';

/**
 * Server component that shows a small "X people viewed this property in
 * the last 7 days" badge in the hero. Uses real GA4 data — no fake
 * counters. Hides itself if the count is too low to be persuasive.
 */
export default async function RecentInterestBadge({
  label,
}: {
  /** Translated label like "viram esta propriedade nos últimos 7 dias" */
  label: (count: string) => string;
}) {
  let count = 0;
  try {
    const snap = await fetchGa4Snapshot(7);
    count = snap.totals.activeUsers;
  } catch {
    return null;
  }

  // Don't show a tiny number — looks worse than no number.
  if (count < 10) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full">
      <Eye size={12} className="text-sand" />
      <span className="text-white text-xs font-medium">
        {label(count.toLocaleString('pt-PT'))}
      </span>
    </div>
  );
}
