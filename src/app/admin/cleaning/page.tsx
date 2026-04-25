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
  Plus,
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
  const [bookingRefs, setBookingRefs] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<PriceSettings>(DEFAULT_PRICES);
  const [priceDraft, setPriceDraft] = useState<PriceSettings>(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingPrices, setSavingPrices] = useState(false);
  const [filter, setFilter] = useState<FilterState>('pending');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAvulsa, setShowAvulsa] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const [tasksRes, allLinkedRes, settingsRes] = await Promise.all([
      supabase
        .from('cleaning_tasks')
        .select('*')
        .is('linked_to_booking_id', null)
        .is('linked_to_external_ref', null)
        .order('cleaning_date', { ascending: true }),
      // Pull just the linked children's date ranges so a head row can
      // display the full grouped stay (Sat→Sat) instead of its own
      // narrow Booking range.
      supabase
        .from('cleaning_tasks')
        .select('external_source, external_ref, linked_to_external_source, linked_to_external_ref, stay_checkout_date, checkin_date')
        .not('linked_to_external_ref', 'is', null),
      supabase
        .from('settings')
        .select('key, value')
        .in('key', ['cleaning_base_fee', 'villa_rooms', 'laundry_fee_per_room']),
    ]);

    const rawTasks = (tasksRes.data || []) as CleaningTask[];
    const linkedChildren = (allLinkedRes.data || []) as Array<{
      external_source: string | null;
      external_ref: string | null;
      linked_to_external_source: string | null;
      linked_to_external_ref: string | null;
      stay_checkout_date: string | null;
      checkin_date: string | null;
    }>;

    const childrenByHead = new Map<string, typeof linkedChildren>();
    for (const c of linkedChildren) {
      if (!c.linked_to_external_source || !c.linked_to_external_ref) continue;
      const key = `${c.linked_to_external_source}|${c.linked_to_external_ref}`;
      const arr = childrenByHead.get(key) || [];
      arr.push(c);
      childrenByHead.set(key, arr);
    }

    const loadedTasks = rawTasks.map((t) => {
      if (!t.external_source || !t.external_ref) return t;
      const key = `${t.external_source}|${t.external_ref}`;
      const children = childrenByHead.get(key);
      if (!children || children.length === 0) return t;
      let maxCo = t.stay_checkout_date || '';
      let minCi = t.checkin_date || '';
      for (const c of children) {
        if (c.stay_checkout_date && c.stay_checkout_date > maxCo) maxCo = c.stay_checkout_date;
        if (c.checkin_date && (!minCi || c.checkin_date < minCi)) minCi = c.checkin_date;
      }
      return { ...t, stay_checkout_date: maxCo, checkin_date: minCi };
    });
    setTasks(loadedTasks);

    const bookingIds = Array.from(
      new Set(loadedTasks.map((t) => t.booking_id).filter((v): v is string => !!v))
    );
    if (bookingIds.length > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, reference')
        .in('id', bookingIds);
      const map: Record<string, string> = {};
      (bookings || []).forEach((b: { id: string; reference: string | null }) => {
        if (b.reference) map[b.id] = b.reference;
      });
      setBookingRefs(map);
    } else {
      setBookingRefs({});
    }

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

  async function createAvulsaTask(date: string, note: string | null) {
    const { error } = await supabase.from('cleaning_tasks').insert({
      cleaning_date: date,
      checkin_date: date,
      stay_checkout_date: date,
      guest_name: note || 'Visita avulsa (só roupas)',
      cleaning_fee_snapshot: 0,
      cleaning_done: true,
      cleaning_done_at: new Date().toISOString(),
      cleaning_paid: true,
      cleaning_paid_at: new Date().toISOString(),
      laundry_fee_snapshot: 0,
      rooms_with_laundry: 0,
      notes: note,
    });
    if (error) {
      showToast('Erro ao criar visita: ' + error.message, 'error');
      return;
    }
    showToast('Visita avulsa criada');
    setShowAvulsa(false);
    await load();
  }

  async function syncTasksFromBookings() {
    setSyncing(true);
    try {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, guest_name, num_guests, checkin_date, checkout_date, status, payment_status')
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
          cleaning_date: b.checkin_date,
          checkin_date: b.checkin_date,
          stay_checkout_date: b.checkout_date,
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

  // For each task, is there any OTHER task where the previous guest
  // checks out on the SAME day this cleaning happens? That's a same-day
  // turnover — the cleaner has only a few hours between departure and
  // arrival.
  const sequenceInfo = useMemo(() => {
    const checkoutDays = new Set<string>();
    for (const t of tasks) if (t.stay_checkout_date) checkoutDays.add(t.stay_checkout_date);
    const info: Record<string, { isTurn: boolean }> = {};
    for (const t of tasks) {
      info[t.id] = { isTurn: checkoutDays.has(t.cleaning_date) };
    }
    return info;
  }, [tasks]);

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
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Limpezas</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAvulsa(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/15 transition-colors text-sm font-medium"
          >
            <Plus size={14} />
            Visita avulsa
          </button>
          <button
            onClick={syncTasksFromBookings}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sincronizar reservas
          </button>
        </div>
      </div>

      {showAvulsa && (
        <AvulsaModal
          onCancel={() => setShowAvulsa(false)}
          onCreate={(date, note) => createAvulsaTask(date, note)}
        />
      )}

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

      {/* Mobile task cards */}
      <div className="sm:hidden space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6 text-center text-gray-500 text-sm">
            Nenhuma tarefa {filter === 'pending' ? 'pendente' : filter === 'closed' ? 'fechada' : ''}
          </div>
        ) : (
          filtered.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              reference={t.booking_id ? bookingRefs[t.booking_id] : null}
              seq={sequenceInfo[t.id] || { isTurn: false }}
              roomOptions={roomOptions}
              onToggleDone={() => toggleCleaningDone(t)}
              onMarkLaundry={(rooms) => markLaundryTaken(t, rooms)}
              onUnmarkLaundry={() => unmarkLaundry(t)}
              onCloseCleaning={() => closeCleaning(t)}
              onCloseLaundry={() => closeLaundry(t)}
              onRenameGuest={(name) => updateTask(t.id, { guest_name: name })}
            />
          ))
        )}
      </div>

      {/* Desktop tasks table */}
      <div className="hidden sm:block bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-white/5">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Ref.</th>
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
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500 text-sm">
                    Nenhuma tarefa {filter === 'pending' ? 'pendente' : filter === 'closed' ? 'fechada' : ''}
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    reference={t.booking_id ? bookingRefs[t.booking_id] : null}
                    seq={sequenceInfo[t.id] || { isTurn: false }}
                    roomOptions={roomOptions}
                    onToggleDone={() => toggleCleaningDone(t)}
                    onMarkLaundry={(rooms) => markLaundryTaken(t, rooms)}
                    onUnmarkLaundry={() => unmarkLaundry(t)}
                    onCloseCleaning={() => closeCleaning(t)}
                    onCloseLaundry={() => closeLaundry(t)}
                    onRenameGuest={(name) => updateTask(t.id, { guest_name: name })}
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

function AvulsaModal({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (date: string, note: string | null) => void;
}) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!date) return;
    setSubmitting(true);
    await onCreate(date, note.trim() || null);
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#16213e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Visita avulsa</h2>
        <p className="text-xs text-gray-400 mb-4">
          Cria uma tarefa só para levantar roupas (sem limpeza associada). A
          equipa verá no &quot;Hoje&quot; da dashboard e marca os quartos quando for.
        </p>

        <label className="block mb-3">
          <span className="block text-xs text-gray-400 mb-1">Data da visita</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        </label>

        <label className="block mb-4">
          <span className="block text-xs text-gray-400 mb-1">Nota (opcional)</span>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={submitting}
            placeholder="ex: roupas da Susanne"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        </label>

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || !date}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'A criar...' : 'Criar visita'}
          </button>
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
  reference,
  seq,
  roomOptions,
  onToggleDone,
  onMarkLaundry,
  onUnmarkLaundry,
  onCloseCleaning,
  onCloseLaundry,
  onRenameGuest,
}: {
  task: CleaningTask;
  reference: string | null;
  seq: { isTurn: boolean };
  roomOptions: number[];
  onToggleDone: () => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
  onCloseCleaning: () => void;
  onCloseLaundry: () => void;
  onRenameGuest: (name: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(task.guest_name || '');

  const weekday = (() => {
    const d = new Date(task.cleaning_date + 'T00:00:00Z');
    const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return { label: labels[d.getUTCDay()], isSaturday: d.getUTCDay() === 6 };
  })();

  // Pick a readable reference token.
  // Site booking → the generated reference (e.g. ZMFUTATMQ).
  // External → tail of the UID (Airbnb / Booking usually embed their IDs there).
  const refLabel = (() => {
    if (reference) return reference;
    if (task.external_ref) {
      const cleaned = task.external_ref.split('@')[0];
      return cleaned.length > 14 ? '…' + cleaned.slice(-12) : cleaned;
    }
    return '—';
  })();
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
      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span>{task.cleaning_date}</span>
          <span
            className={`text-xs font-semibold ${
              weekday.isSaturday ? 'text-gray-500' : 'text-amber-400'
            }`}
            title={weekday.isSaturday ? 'Sábado' : 'Não é sábado'}
          >
            {weekday.label}
          </span>
          {seq.isTurn && (
            <span
              className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold uppercase tracking-wider"
              title="Turnover no mesmo dia: hóspede sai e outro entra no mesmo dia"
            >
              TURN
            </span>
          )}
        </div>
        {task.stay_checkout_date && (
          <p className="text-xs text-gray-500 mt-0.5">
            est. {task.cleaning_date.slice(5)} → {task.stay_checkout_date.slice(5)}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <span
          className="text-xs font-mono text-blue-300/80"
          title={task.external_ref || reference || ''}
        >
          {refLabel}
        </span>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={() => {
              setEditing(false);
              const next = draftName.trim() || null;
              if ((task.guest_name || null) !== next) onRenameGuest(next);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setDraftName(task.guest_name || '');
                setEditing(false);
              }
            }}
            placeholder="Nome do hóspede"
            className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500/50"
          />
        ) : (
          <button
            onClick={() => {
              setDraftName(task.guest_name || '');
              setEditing(true);
            }}
            className="text-left w-full"
            title="Clica para editar"
          >
            <p className="text-white hover:text-blue-300 transition-colors">
              {task.guest_name || <span className="italic text-gray-500">sem nome</span>}
            </p>
          </button>
        )}
        {task.num_guests != null && (
          <p className="text-xs text-gray-500">{task.num_guests} hóspede(s)</p>
        )}
        <CleanerNote task={task} />
        <PhotoStrip task={task} />
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

function TaskCard({
  task,
  reference,
  seq,
  roomOptions,
  onToggleDone,
  onMarkLaundry,
  onUnmarkLaundry,
  onCloseCleaning,
  onCloseLaundry,
  onRenameGuest,
}: {
  task: CleaningTask;
  reference: string | null;
  seq: { isTurn: boolean };
  roomOptions: number[];
  onToggleDone: () => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
  onCloseCleaning: () => void;
  onCloseLaundry: () => void;
  onRenameGuest: (name: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(task.guest_name || '');

  const weekday = (() => {
    const d = new Date(task.cleaning_date + 'T00:00:00Z');
    const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return { label: labels[d.getUTCDay()], isSaturday: d.getUTCDay() === 6 };
  })();

  const refLabel = (() => {
    if (reference) return reference;
    if (task.external_ref) {
      const cleaned = task.external_ref.split('@')[0];
      return cleaned.length > 14 ? '…' + cleaned.slice(-12) : cleaned;
    }
    return '—';
  })();

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
    <div
      className={`bg-[#16213e] border rounded-2xl p-4 space-y-3 ${
        seq.isTurn ? 'border-red-500/40' : 'border-white/5'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-white">{task.cleaning_date}</span>
            <span
              className={`text-xs font-semibold ${
                weekday.isSaturday ? 'text-gray-500' : 'text-amber-400'
              }`}
            >
              {weekday.label}
            </span>
            {seq.isTurn && (
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold uppercase tracking-wider">
                TURN
              </span>
            )}
          </div>
          {task.stay_checkout_date && (
            <p className="text-[11px] text-gray-500 mt-0.5">
              est. {task.cleaning_date.slice(5)} → {task.stay_checkout_date.slice(5)}
            </p>
          )}
        </div>
        <span className="text-[10px] font-mono text-blue-300/80 mt-1 whitespace-nowrap">
          {refLabel}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              onBlur={() => {
                setEditing(false);
                const next = draftName.trim() || null;
                if ((task.guest_name || null) !== next) onRenameGuest(next);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') {
                  setDraftName(task.guest_name || '');
                  setEditing(false);
                }
              }}
              placeholder="Nome do hóspede"
              className="w-full px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          ) : (
            <button
              onClick={() => {
                setDraftName(task.guest_name || '');
                setEditing(true);
              }}
              className="text-left w-full"
            >
              <p className="text-white text-sm truncate">
                {task.guest_name || <span className="italic text-gray-500">sem nome</span>}
              </p>
            </button>
          )}
          <p className="text-[11px] text-gray-500">
            {task.num_guests != null ? `${task.num_guests} hóspede(s) · ` : ''}
            {sourceLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
        <button
          onClick={onToggleDone}
          disabled={task.cleaning_paid}
          className="flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {task.cleaning_done ? (
            <CheckCircle2 size={18} className="text-green-400" />
          ) : (
            <Circle size={18} className="text-gray-500" />
          )}
          <span className="text-sm text-white">
            {task.cleaning_done ? 'Limpeza feita' : 'Limpeza pendente'}
          </span>
        </button>
        <span className="text-xs text-gray-400">
          {Number(task.cleaning_fee_snapshot).toFixed(2)} €
          {task.cleaning_paid && <span className="text-gray-500"> · paga</span>}
        </span>
      </div>

      <div className="bg-white/5 rounded-lg px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-white flex items-center gap-2">
            <Shirt size={16} className="text-blue-300" /> Roupas
          </span>
          {task.laundry_taken && (
            <span className="text-xs text-blue-300">
              {task.rooms_with_laundry} q ·{' '}
              {Number(task.laundry_fee_snapshot).toFixed(2)} €
              {task.laundry_paid && <span className="text-gray-500"> · paga</span>}
            </span>
          )}
        </div>
        {task.laundry_taken ? (
          !task.laundry_paid && (
            <button
              onClick={onUnmarkLaundry}
              className="text-[11px] text-gray-500 hover:text-gray-300"
            >
              reset
            </button>
          )
        ) : (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={() => onMarkLaundry(0)}
              className="px-2 py-1 rounded bg-white/5 hover:bg-gray-500/30 text-gray-300 text-xs"
            >
              sem
            </button>
            {roomOptions.map((n) => (
              <button
                key={n}
                onClick={() => onMarkLaundry(n)}
                className="px-2 py-1 rounded bg-white/5 hover:bg-blue-500/30 text-gray-300 text-xs"
              >
                {n}q
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">A pagar</p>
          <p className={`text-base font-semibold ${amount > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
            {amount.toFixed(2)} €
          </p>
        </div>
        <div className="flex items-center gap-1">
          {task.cleaning_done && !task.cleaning_paid && (
            <button
              onClick={onCloseCleaning}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-green-500/15 text-green-300 hover:bg-green-500/25 text-xs font-medium"
            >
              <Lock size={11} /> limpeza
            </button>
          )}
          {task.laundry_taken && !task.laundry_paid && (
            <button
              onClick={onCloseLaundry}
              className="inline-flex items-center gap-1 px-2 py-1.5 rounded bg-blue-500/15 text-blue-300 hover:bg-blue-500/25 text-xs font-medium"
            >
              <Lock size={11} /> roupas
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CleanerNote({ task }: { task: CleaningTask }) {
  const note = (task as CleaningTask & { cleaner_notes?: string | null }).cleaner_notes;
  if (!note || !note.trim()) return null;
  return (
    <div className="mt-1.5 inline-flex items-start gap-1.5 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 max-w-full">
      <span className="leading-none">📝</span>
      <span className="whitespace-pre-wrap break-words">{note}</span>
    </div>
  );
}

function PhotoStrip({ task }: { task: CleaningTask }) {
  const photos = (task as CleaningTask & { photo_urls?: string[] }).photo_urls || [];
  const [lightbox, setLightbox] = useState<string | null>(null);
  if (!photos.length) return null;
  return (
    <>
      <div className="mt-1.5 flex items-center gap-1 flex-wrap">
        {photos.slice(0, 4).map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => setLightbox(u)}
            className="relative w-10 h-10 rounded overflow-hidden bg-white/5 border border-white/10 hover:ring-1 hover:ring-blue-400"
            title="Ver foto"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="prova" className="w-full h-full object-cover" />
          </button>
        ))}
        {photos.length > 4 && (
          <span className="text-[10px] text-gray-400 ml-1">+{photos.length - 4}</span>
        )}
      </div>
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="prova" className="max-h-full max-w-full rounded-lg" />
        </div>
      )}
    </>
  );
}
