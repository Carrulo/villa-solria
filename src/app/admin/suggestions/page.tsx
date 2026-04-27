'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, CheckCircle2, Circle, Star } from 'lucide-react';

interface Suggestion {
  id: string;
  booking_id: string | null;
  guest_name: string | null;
  locale: string | null;
  rating: number | null;
  message: string;
  acknowledged: boolean;
  created_at: string;
}

interface BookingMini {
  id: string;
  reference: string | null;
  checkin_date: string | null;
  checkout_date: string | null;
}

export default function AdminSuggestionsPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [bookings, setBookings] = useState<Record<string, BookingMini>>({});
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('guest_suggestions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      setToast('Erro a carregar');
      setLoading(false);
      return;
    }
    const list = (data || []) as Suggestion[];
    setItems(list);

    const ids = Array.from(new Set(list.map((s) => s.booking_id).filter((v): v is string => !!v)));
    if (ids.length > 0) {
      const { data: bs } = await supabase
        .from('bookings')
        .select('id, reference, checkin_date, checkout_date')
        .in('id', ids);
      const map: Record<string, BookingMini> = {};
      (bs || []).forEach((b) => {
        map[(b as BookingMini).id] = b as BookingMini;
      });
      setBookings(map);
    }
    setLoading(false);
  }

  async function toggleAck(s: Suggestion) {
    const next = !s.acknowledged;
    const { error } = await supabase
      .from('guest_suggestions')
      .update({ acknowledged: next })
      .eq('id', s.id);
    if (error) {
      setToast('Erro ao actualizar');
      setTimeout(() => setToast(null), 2500);
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, acknowledged: next } : x)));
  }

  const visible = useMemo(
    () => (filter === 'pending' ? items.filter((s) => !s.acknowledged) : items),
    [items, filter]
  );

  const stats = useMemo(() => {
    const total = items.length;
    const pending = items.filter((s) => !s.acknowledged).length;
    const rated = items.filter((s) => s.rating);
    const avg =
      rated.length > 0
        ? rated.reduce((a, s) => a + (s.rating || 0), 0) / rated.length
        : null;
    return { total, pending, avg };
  }, [items]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <Sparkles className="text-amber-300" size={22} /> Sugestões dos hóspedes
        </h1>
        <div className="text-xs text-gray-400 flex items-center gap-3">
          <span>{stats.pending} por ler</span>
          <span>·</span>
          <span>{stats.total} total</span>
          {stats.avg !== null && (
            <>
              <span>·</span>
              <span className="text-amber-300">★ {stats.avg.toFixed(1)}</span>
            </>
          )}
        </div>
      </header>

      <div className="flex items-center gap-2">
        {(['pending', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {f === 'pending' ? `Por ler (${stats.pending})` : `Todas (${stats.total})`}
          </button>
        ))}
      </div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-red-500/20 text-red-200 text-sm">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400 text-sm">A carregar…</div>
      ) : visible.length === 0 ? (
        <div className="bg-[#16213e] rounded-2xl border border-white/5 p-8 text-center text-gray-500 text-sm">
          {filter === 'pending' ? 'Sem sugestões por ler.' : 'Sem sugestões ainda.'}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => {
            const b = s.booking_id ? bookings[s.booking_id] : undefined;
            return (
              <div
                key={s.id}
                className={`bg-[#16213e] rounded-2xl border p-4 sm:p-5 ${
                  s.acknowledged ? 'border-white/5 opacity-70' : 'border-amber-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {s.guest_name || <span className="italic text-gray-500">sem nome</span>}
                      {s.locale && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-gray-500">
                          {s.locale}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {new Date(s.created_at).toLocaleString('pt-PT', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                      {b && (
                        <>
                          <span className="mx-1">·</span>
                          <span className="text-blue-300/80 font-mono">{b.reference || '—'}</span>
                          {b.checkin_date && b.checkout_date && (
                            <span className="text-gray-600 ml-1">
                              {b.checkin_date.slice(5)} → {b.checkout_date.slice(5)}
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.rating && (
                      <span className="inline-flex items-center gap-0.5 text-amber-300 text-sm">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={14}
                            className={i < s.rating! ? 'fill-amber-300 text-amber-300' : 'text-stone-600'}
                          />
                        ))}
                      </span>
                    )}
                    <button
                      onClick={() => toggleAck(s)}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white"
                      title={s.acknowledged ? 'Marcar como por ler' : 'Marcar como lida'}
                    >
                      {s.acknowledged ? (
                        <CheckCircle2 size={16} className="text-green-400" />
                      ) : (
                        <Circle size={16} className="text-gray-500" />
                      )}
                      {s.acknowledged ? 'lida' : 'marcar lida'}
                    </button>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                  {s.message}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
