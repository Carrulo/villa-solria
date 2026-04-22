'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking, CleaningTask } from '@/lib/supabase';
import {
  CheckCircle2,
  Circle,
  Euro,
  RefreshCw,
  Save,
  Sparkles,
  Shirt,
  Lock,
} from 'lucide-react';

type LaundryTable = Record<string, number>;

interface PriceSettings {
  cleaning_base_fee: number;
  villa_rooms: number;
  laundry_fee_per_room: LaundryTable;
}

const DEFAULT_PRICES: PriceSettings = {
  cleaning_base_fee: 50,
  villa_rooms: 3,
  laundry_fee_per_room: { '1': 0, '2': 0, '3': 0 },
};

type FilterState = 'pending' | 'closed' | 'all';

export default function AdminCleaningPage() {
  const [tasks, setTasks] = useState<CleaningTask[]>([]);
  const [prices, setPrices] = useState<PriceSettings>(DEFAULT_PRICES);
  const [priceDraft, setPriceDraft] = useState<PriceSettings>(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [filter, setFilter] = useState<FilterState>('pending');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    void load();
  }, []);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const [tasksRes, settingsRes] = await Promise.all([
      supabase.from('cleaning_tasks').select('*').order('cleaning_date', { ascending: true }),
      supabase
        .from('settings')
        .select('key, value')
        .in('key', ['cleaning_base_fee', 'villa_rooms', 'laundry_fee_per_room']),
    ]);

    setTasks((tasksRes.data || []) as CleaningTask[]);

    const byKey: Record<string, string> = {};
    (settingsRes.data || []).forEach((r: { key: string; value: string }) => {
      byKey[r.key] = r.value;
    });

    const loaded: PriceSettings = {
      cleaning_base_fee: Number(byKey.cleaning_base_fee ?? DEFAULT_PRICES.cleaning_base_fee),
      villa_rooms: Number(byKey.villa_rooms ?? DEFAULT_PRICES.villa_rooms),
      laundry_fee_per_room: parseLaundryTable(byKey.laundry_fee_per_room),
    };
    setPrices(loaded);
    setPriceDraft(loaded);
    setLoading(false);
  }

  function parseLaundryTable(raw: string | undefined): LaundryTable {
    if (!raw) return { ...DEFAULT_PRICES.laundry_fee_per_room };
    try {
      const parsed = JSON.parse(raw);
      const out: LaundryTable = {};
      Object.entries(parsed).forEach(([k, v]) => {
        out[k] = Number(v) || 0;
      });
      return out;
    } catch {
      return { ...DEFAULT_PRICES.laundry_fee_per_room };
    }
  }

  function laundryFee(rooms: number, table: LaundryTable): number {
    if (rooms <= 0) return 0;
    return Number(table[String(rooms)] ?? 0);
  }

  async function saveSettings() {
    setSavingPrices(true);
    const rows = [
      { key: 'cleaning_base_fee', value: String(priceDraft.cleaning_base_fee) },
      { key: 'villa_rooms', value: String(priceDraft.villa_rooms) },
      {
        key: 'laundry_fee_per_room',
        value: JSON.stringify(priceDraft.laundry_fee_per_room),
      },
    ];
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    setSavingPrices(false);
    if (error) {
      showToast('Erro ao guardar preços', 'error');
      return;
    }
    setPrices(priceDraft);
    showToast('Preços guardados');
  }

  async function syncTasksFromBookings() {
    setSyncing(true);
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, guest_name, num_guests, checkout_date, status, payment_status')
        .in('status', ['confirmed'])
        .in('payment_status', ['paid'])
        .order('checkout_date', { ascending: true });

      const { data: existing } = await supabase
        .from('cleaning_tasks')
        .select('booking_id')
        .not('booking_id', 'is', null);

      const existingIds = new Set((existing || []).map((r: { booking_id: string }) => r.booking_id));

      const toInsert = ((bookings || []) as Booking[])
        .filter((b) => !existingIds.has(b.id))
        .map((b) => ({
          booking_id: b.id,
          cleaning_date: b.checkout_date,
          guest_name: b.guest_name,
          num_guests: b.num_guests,
          cleaning_fee_snapshot: prices.cleaning_base_fee,
          laundry_fee_snapshot: 0,
          rooms_with_laundry: 0,
        }));

      if (toInsert.length === 0) {
        showToast('Nada novo para sincronizar');
      } else {
        const { error } = await supabase.from('cleaning_tasks').insert(toInsert);
        if (error) {
          showToast('Erro ao sincronizar: ' + error.message, 'error');
        } else {
          showToast(`${toInsert.length} tarefa(s) criada(s)`);
          await load();
        }
      }
    } finally {
      setSyncing(false);
    }
  }

  async function updateTask(id: string, patch: Partial<CleaningTask>) {
    const { error } = await supabase.from('cleaning_tasks').update(patch).eq('id', id);
    if (error) {
      showToast('Erro ao actualizar', 'error');
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function toggleCleaningDone(t: CleaningTask) {
    const done = !t.cleaning_done;
    await updateTask(t.id, {
      cleaning_done: done,
      cleaning_done_at: done ? new Date().toISOString() : null,
    });
  }

  async function markLaundryTaken(t: CleaningTask, rooms: number) {
    const fee = laundryFee(rooms, prices.laundry_fee_per_room);
    await updateTask(t.id, {
      laundry_taken: true,
      laundry_taken_at: new Date().toISOString(),
      rooms_with_laundry: rooms,
      laundry_fee_snapshot: fee,
    });
  }

  async function unmarkLaundry(t: CleaningTask) {
    await updateTask(t.id, {
      laundry_taken: false,
      laundry_taken_at: null,
      rooms_with_laundry: 0,
      laundry_fee_snapshot: 0,
    });
  }

  async function closeCleaning(t: CleaningTask) {
    await updateTask(t.id, {
      cleaning_paid: true,
      cleaning_paid_at: new Date().toISOString(),
    });
  }

  async function closeLaundry(t: CleaningTask) {
    await updateTask(t.id, {
      laundry_paid: true,
      laundry_paid_at: new Date().toISOString(),
    });
  }

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      // A task is only closed when BOTH parts are resolved:
      // - cleaning: done + paid
      // - laundry: explicitly marked (taken=true), and if rooms>0 also paid.
      //   laundry_taken=false means "not yet decided" — keep in pending.
      const cleaningClosed = t.cleaning_done && t.cleaning_paid;
      const laundryClosed =
        t.laundry_taken && (t.rooms_with_laundry === 0 || t.laundry_paid);
      const isClosed = cleaningClosed && laundryClosed;
      if (filter === 'pending') return !isClosed;
      if (filter === 'closed') return isClosed;
      return true;
    });
  }, [tasks, filter]);

  const summary = useMemo(() => {
    let owedCleaning = 0;
    let owedLaundry = 0;
    tasks.forEach((t) => {
      if (t.cleaning_done && !t.cleaning_paid) owedCleaning += Number(t.cleaning_fee_snapshot);
      if (t.laundry_taken && !t.laundry_paid) owedLaundry += Number(t.laundry_fee_snapshot);
    });
    return { owedCleaning, owedLaundry };
  }, [tasks]);

  if (loading) {
    return <div className="text-gray-400">A carregar limpezas...</div>;
  }

  const roomOptions = Array.from({ length: prices.villa_rooms }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Limpezas</h1>
        <button
          onClick={syncTasksFromBookings}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          Sincronizar reservas
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SummaryCard
          icon={<Sparkles size={18} />}
          label="A pagar em limpeza"
          value={`${summary.owedCleaning.toFixed(2)} €`}
        />
        <SummaryCard
          icon={<Shirt size={18} />}
          label="A pagar em roupas"
          value={`${summary.owedLaundry.toFixed(2)} €`}
        />
      </div>

      {/* Prices settings */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
            <Euro size={14} /> Preços (internos — pagamento à equipa)
          </h2>
          <button
            onClick={saveSettings}
            disabled={savingPrices}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-colors text-xs font-medium disabled:opacity-50"
          >
            <Save size={12} />
            {savingPrices ? 'A guardar...' : 'Guardar'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PriceInput
            label="Limpeza base (€)"
            value={priceDraft.cleaning_base_fee}
            onChange={(v) => setPriceDraft((p) => ({ ...p, cleaning_base_fee: v }))}
          />
          <PriceInput
            label="Nº de quartos da villa"
            value={priceDraft.villa_rooms}
            onChange={(v) =>
              setPriceDraft((p) => {
                const nextTable: LaundryTable = {};
                for (let i = 1; i <= v; i++) {
                  nextTable[String(i)] = p.laundry_fee_per_room[String(i)] ?? 0;
                }
                return { ...p, villa_rooms: v, laundry_fee_per_room: nextTable };
              })
            }
          />
        </div>

        <div className="mt-4">
          <p className="text-xs text-gray-400 mb-2">Preço das roupas por nº de quartos usados</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: priceDraft.villa_rooms }, (_, i) => i + 1).map((n) => (
              <PriceInput
                key={n}
                label={`${n} quarto${n > 1 ? 's' : ''} (€)`}
                value={priceDraft.laundry_fee_per_room[String(n)] ?? 0}
                onChange={(v) =>
                  setPriceDraft((p) => ({
                    ...p,
                    laundry_fee_per_room: { ...p.laundry_fee_per_room, [String(n)]: v },
                  }))
                }
              />
            ))}
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['pending', 'closed', 'all'] as const).map((f) => {
          const label = { pending: 'Por fechar', closed: 'Fechadas', all: 'Todas' }[f];
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          );
        })}
        <span className="text-xs text-gray-500 ml-2">{filtered.length} tarefa(s)</span>
      </div>

      {/* Tasks table */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-white/5">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Hóspede</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Limpeza</th>
                <th className="px-4 py-3">Roupas</th>
                <th className="px-4 py-3 text-right">A pagar</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500 text-sm">
                    Nenhuma tarefa {filter === 'pending' ? 'pendente' : filter === 'closed' ? 'fechada' : ''}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    roomOptions={roomOptions}
                    onToggleDone={() => toggleCleaningDone(t)}
                    onMarkLaundry={(rooms) => markLaundryTaken(t, rooms)}
                    onUnmarkLaundry={() => unmarkLaundry(t)}
                    onCloseCleaning={() => closeCleaning(t)}
                    onCloseLaundry={() => closeLaundry(t)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-[#16213e] rounded-2xl border border-white/5 p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-300">
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function PriceInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      <input
        type="number"
        min={0}
        step="0.5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
      />
    </label>
  );
}

function TaskRow({
  task,
  roomOptions,
  onToggleDone,
  onMarkLaundry,
  onUnmarkLaundry,
  onCloseCleaning,
  onCloseLaundry,
}: {
  task: CleaningTask;
  roomOptions: number[];
  onToggleDone: () => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
  onCloseCleaning: () => void;
  onCloseLaundry: () => void;
}) {
  const amount =
    (!task.cleaning_paid && task.cleaning_done ? Number(task.cleaning_fee_snapshot) : 0) +
    (!task.laundry_paid && task.laundry_taken ? Number(task.laundry_fee_snapshot) : 0);

  const sourceLabel = task.booking_id
    ? 'Site'
    : task.external_source === 'airbnb_ical'
    ? 'Airbnb'
    : task.external_source === 'booking_ical'
    ? 'Booking'
    : '-';

  return (
    <tr className="hover:bg-white/[0.02] text-sm">
      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">{task.cleaning_date}</td>
      <td className="px-4 py-3">
        <p className="text-white">{task.guest_name || '—'}</p>
        {task.num_guests != null && (
          <p className="text-xs text-gray-500">{task.num_guests} hóspede(s)</p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-gray-400">{sourceLabel}</td>

      {/* Cleaning cell */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDone}
            disabled={task.cleaning_paid}
            className="p-1 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            title={task.cleaning_done ? 'Marcar como não feita' : 'Marcar como feita'}
          >
            {task.cleaning_done ? (
              <CheckCircle2 size={18} className="text-green-400" />
            ) : (
              <Circle size={18} className="text-gray-500" />
            )}
          </button>
          <div className="text-xs">
            <p className={task.cleaning_done ? 'text-green-400' : 'text-gray-400'}>
              {task.cleaning_done ? 'feita' : 'pendente'}
            </p>
            <p className="text-gray-500">
              {Number(task.cleaning_fee_snapshot).toFixed(2)} €
              {task.cleaning_paid && <span className="text-gray-500"> · paga</span>}
            </p>
          </div>
        </div>
      </td>

      {/* Laundry cell */}
      <td className="px-4 py-3">
        {task.laundry_taken ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-blue-400" />
            <div className="text-xs">
              <p className="text-blue-300">
                {task.rooms_with_laundry} quarto{task.rooms_with_laundry !== 1 ? 's' : ''}
              </p>
              <p className="text-gray-500">
                {Number(task.laundry_fee_snapshot).toFixed(2)} €
                {task.laundry_paid && <span className="text-gray-500"> · paga</span>}
              </p>
            </div>
            {!task.laundry_paid && (
              <button
                onClick={onUnmarkLaundry}
                className="text-xs text-gray-500 hover:text-gray-300 ml-1"
                title="Desmarcar"
              >
                reset
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => onMarkLaundry(0)}
              className="px-2 py-0.5 rounded bg-white/5 hover:bg-gray-500/30 text-gray-300 hover:text-white text-xs"
              title="Marcar como sem roupa (0€)"
            >
              sem
            </button>
            {roomOptions.map((n) => (
              <button
                key={n}
                onClick={() => onMarkLaundry(n)}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-blue-500/30 text-gray-300 hover:text-white text-xs"
                title={`Marcar ${n} quarto(s) de roupa`}
              >
                {n}q
              </button>
            ))}
          </div>
        )}
      </td>

      <td className="px-4 py-3 text-right">
        <span className={`font-semibold ${amount > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
          {amount.toFixed(2)} €
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1 justify-end">
          {task.cleaning_done && !task.cleaning_paid && (
            <button
              onClick={onCloseCleaning}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-medium"
              title="Fechar pagamento da limpeza"
            >
              <Lock size={11} /> limpeza
            </button>
          )}
          {task.laundry_taken && !task.laundry_paid && (
            <button
              onClick={onCloseLaundry}
              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium"
              title="Fechar pagamento das roupas"
            >
              <Lock size={11} /> roupas
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
