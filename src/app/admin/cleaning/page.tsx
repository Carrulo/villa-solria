'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking, CleaningTask } from '@/lib/supabase';
import {
  buildCleaningMessage,
  buildUpcomingMessage,
  type UpcomingCleaning,
} from '@/lib/cleaning-message';
import { whatsAppLink } from '@/lib/whatsapp';
import { roomProfile, shortRoom } from '@/lib/villa-rooms';
import {
  CLEANERS,
  laundryByWeight,
  laundryKg,
  labourCost,
  personHours,
  wallClockHours,
  formatHours,
} from '@/lib/cleaning-cost';
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
  MessageCircle,
} from 'lucide-react';

type LaundryTable = Record<string, number>;

interface PriceSettings {
  cleaning_base_fee: number;
  cleaner_hourly_rate: number;
  laundry_price_per_kg: number;
  laundry_vat_percent: number;
  villa_rooms: number;
  laundry_fee_per_room: LaundryTable;
}

const DEFAULT_PRICES: PriceSettings = {
  cleaning_base_fee: 50,
  cleaner_hourly_rate: 15,
  laundry_price_per_kg: 3.5,
  laundry_vat_percent: 23,
  villa_rooms: 3,
  laundry_fee_per_room: { '1': 0, '2': 0, '3': 0 },
};

type FilterState = 'pending' | 'closed' | 'all';

interface OwnerInstructionsPatch {
  kind: 'turnover' | 'midstay';
  owner_notes: string | null;
  rooms_to_prepare: number[] | null;
  room_plan: Record<string, number> | null;
  towels_override: number | null;
}

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
  const [cleanerPhone, setCleanerPhone] = useState('');
  const [phoneDraft, setPhoneDraft] = useState('');
  const [cleanerName, setCleanerName] = useState('');
  const [nameDraft, setNameDraft] = useState('');

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
        .in('key', ['cleaning_base_fee', 'villa_rooms', 'laundry_fee_per_room', 'cleaner_phone', 'cleaner_hourly_rate', 'cleaner_name', 'laundry_price_per_kg', 'laundry_vat_percent']),
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
      cleaner_hourly_rate: Number(byKey.cleaner_hourly_rate ?? DEFAULT_PRICES.cleaner_hourly_rate),
      laundry_price_per_kg: Number(
        byKey.laundry_price_per_kg ?? DEFAULT_PRICES.laundry_price_per_kg
      ),
      laundry_vat_percent: Number(
        byKey.laundry_vat_percent ?? DEFAULT_PRICES.laundry_vat_percent
      ),
      villa_rooms: Number(byKey.villa_rooms ?? DEFAULT_PRICES.villa_rooms),
      laundry_fee_per_room: parseLaundryTable(byKey.laundry_fee_per_room),
    };
    setPrices(loaded);
    setPriceDraft(loaded);
    const phone = byKey.cleaner_phone ?? '';
    setCleanerPhone(phone);
    setPhoneDraft(phone);
    const name = byKey.cleaner_name ?? '';
    setCleanerName(name);
    setNameDraft(name);
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
      { key: 'cleaner_hourly_rate', value: String(priceDraft.cleaner_hourly_rate) },
      { key: 'laundry_price_per_kg', value: String(priceDraft.laundry_price_per_kg) },
      { key: 'laundry_vat_percent', value: String(priceDraft.laundry_vat_percent) },
      { key: 'villa_rooms', value: String(priceDraft.villa_rooms) },
      {
        key: 'laundry_fee_per_room',
        value: JSON.stringify(priceDraft.laundry_fee_per_room),
      },
      { key: 'cleaner_phone', value: phoneDraft.trim() },
      { key: 'cleaner_name', value: nameDraft.trim() },
    ];
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    setSavingPrices(false);
    if (error) {
      showToast('Erro ao guardar preços', 'error');
      return;
    }
    setPrices(priceDraft);
    setCleanerPhone(phoneDraft.trim());
    setCleanerName(nameDraft.trim());
    showToast('Definições guardadas');
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
          cleaning_date: b.checkout_date,
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

  // She tells us how long it took; that's what gets paid. The euro value
  // is frozen on the task so a later rate change never rewrites history.
  async function updateHoursWorked(t: CleaningTask, hours: number) {
    if (t.cleaning_paid) return;
    const safe = Math.max(0, Number.isFinite(hours) ? hours : 0);
    await updateTask(t.id, {
      hours_worked: safe > 0 ? safe : null,
      cleaning_fee_snapshot: safe > 0 ? safe * prices.cleaner_hourly_rate : 0,
    });
  }

  async function updateCleaningFee(t: CleaningTask, fee: number) {
    if (t.cleaning_paid) return;
    const safe = Math.max(0, Number.isFinite(fee) ? fee : 0);
    await updateTask(t.id, { cleaning_fee_snapshot: safe });
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

  // A same-day turnover is a cleaning day on which another stay CHECKS
  // IN — guests out by 11h, new guests from 16h, so the clean has a hard
  // window. Comparing against checkout days (as this once did) matched
  // every task against itself, because since the May-2026 model change
  // `cleaning_date` IS the checkout day.
  const sequenceInfo = useMemo(() => {
    const arrivalDays = new Set<string>();
    for (const t of tasks) if (t.checkin_date) arrivalDays.add(t.checkin_date);
    const info: Record<string, { isTurn: boolean }> = {};
    for (const t of tasks) {
      info[t.id] = { isTurn: arrivalDays.has(t.cleaning_date) };
    }
    return info;
  }, [tasks]);

  // The message the host sends the cleaner: this cleaning day, its
  // window, which rooms get fresh linen, plus the next few cleanings so
  // she can plan her week.
  const whatsAppByTask = useMemo(() => {
    const ordered = [...tasks].sort((a, b) => a.cleaning_date.localeCompare(b.cleaning_date));
    const out: Record<string, string | null> = {};
    for (const t of ordered) {
      const upcoming: UpcomingCleaning[] = ordered
        .filter((u) => u.cleaning_date > t.cleaning_date && !u.cleaning_done)
        .slice(0, 5)
        .map((u) => ({
          cleaning_date: u.cleaning_date,
          isTurn: !!sequenceInfo[u.id]?.isTurn,
        }));
      const text = buildCleaningMessage({
        task: {
          cleaning_date: t.cleaning_date,
          guest_name: t.guest_name,
          rooms_to_prepare: t.rooms_to_prepare ?? null,
          room_plan: t.room_plan ?? null,
          towels_override: t.towels_override ?? null,
          kind: t.kind ?? 'turnover',
          owner_notes: t.owner_notes ?? null,
          num_guests: t.num_guests,
        },
        isTurn: !!sequenceInfo[t.id]?.isTurn,
        upcoming,
        villaRooms: prices.villa_rooms,
        cleanerName,
      });
      out[t.id] = whatsAppLink(cleanerPhone, text);
    }
    return out;
  }, [tasks, sequenceInfo, prices.villa_rooms, cleanerPhone, cleanerName]);

  // One message with every cleaning still ahead, for when she asks
  // "what have I got coming up?".
  const upcomingWhatsAppHref = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const upcoming: UpcomingCleaning[] = [...tasks]
      .filter((t) => t.cleaning_date >= today && !t.cleaning_done)
      .sort((a, b) => a.cleaning_date.localeCompare(b.cleaning_date))
      .slice(0, 8)
      .map((t) => ({ cleaning_date: t.cleaning_date, isTurn: !!sequenceInfo[t.id]?.isTurn }));
    return whatsAppLink(cleanerPhone, buildUpcomingMessage(upcoming, cleanerName));
  }, [tasks, sequenceInfo, cleanerPhone, cleanerName]);

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
          {upcomingWhatsAppHref && (
            <a
              href={upcomingWhatsAppHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors text-sm font-medium"
              title="Manda à empregada a lista das próximas limpezas"
            >
              <MessageCircle size={14} />
              Próximas limpezas
            </a>
          )}
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
            <Euro size={14} /> Preços e contactos (internos)
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
            label="€/hora por pessoa (equipa de limpeza)"
            value={priceDraft.cleaner_hourly_rate}
            onChange={(v) => setPriceDraft((p) => ({ ...p, cleaner_hourly_rate: v }))}
          />
          <PriceInput
            label="Lavandaria (€/kg, sem IVA)"
            value={priceDraft.laundry_price_per_kg}
            onChange={(v) => setPriceDraft((p) => ({ ...p, laundry_price_per_kg: v }))}
          />
          <PriceInput
            label="IVA da lavandaria (%)"
            value={priceDraft.laundry_vat_percent}
            onChange={(v) => setPriceDraft((p) => ({ ...p, laundry_vat_percent: v }))}
          />
          <PriceInput
            label="Limpeza base (€) — valor fixo antigo"
            value={priceDraft.cleaning_base_fee}
            onChange={(v) => setPriceDraft((p) => ({ ...p, cleaning_base_fee: v }))}
          />
          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">Nome da empregada</span>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="ex: Leonor"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-gray-400 mb-1">
              WhatsApp da empregada
            </span>
            <input
              type="tel"
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              placeholder="+351 9xx xxx xxx"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </label>
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
          <p className="text-xs text-gray-400 mb-2">
            Tabela antiga (pagamento à empregada por lavar) — usada só no histórico
          </p>
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
              whatsAppHref={whatsAppByTask[t.id] || null}
              roomOptions={roomOptions}
              laundryPricePerKg={prices.laundry_price_per_kg}
                    laundryVatPercent={prices.laundry_vat_percent}
                    hourlyRate={prices.cleaner_hourly_rate}
              onToggleDone={() => toggleCleaningDone(t)}
              onMarkLaundry={(rooms) => markLaundryTaken(t, rooms)}
              onUnmarkLaundry={() => unmarkLaundry(t)}
              onCloseCleaning={() => closeCleaning(t)}
              onCloseLaundry={() => closeLaundry(t)}
              onRenameGuest={(name) => updateTask(t.id, { guest_name: name })}
              onUpdateFee={(fee) => updateCleaningFee(t, fee)}
              onUpdateHours={(h) => updateHoursWorked(t, h)}
              onSaveOwnerInstructions={(patch) => updateTask(t.id, patch)}
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
                    whatsAppHref={whatsAppByTask[t.id] || null}
                    roomOptions={roomOptions}
                    laundryPricePerKg={prices.laundry_price_per_kg}
                    laundryVatPercent={prices.laundry_vat_percent}
                    hourlyRate={prices.cleaner_hourly_rate}
                    onToggleDone={() => toggleCleaningDone(t)}
                    onMarkLaundry={(rooms) => markLaundryTaken(t, rooms)}
                    onUnmarkLaundry={() => unmarkLaundry(t)}
                    onCloseCleaning={() => closeCleaning(t)}
                    onCloseLaundry={() => closeLaundry(t)}
                    onRenameGuest={(name) => updateTask(t.id, { guest_name: name })}
                    onUpdateFee={(fee) => updateCleaningFee(t, fee)}
                    onUpdateHours={(h) => updateHoursWorked(t, h)}
                    onSaveOwnerInstructions={(patch) => updateTask(t.id, patch)}
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
  whatsAppHref,
  roomOptions,
  laundryPricePerKg,
  laundryVatPercent,
  hourlyRate,
  onToggleDone,
  onMarkLaundry,
  onUnmarkLaundry,
  onCloseCleaning,
  onCloseLaundry,
  onRenameGuest,
  onUpdateFee,
  onUpdateHours,
  onSaveOwnerInstructions,
}: {
  task: CleaningTask;
  reference: string | null;
  seq: { isTurn: boolean };
  whatsAppHref: string | null;
  roomOptions: number[];
  laundryPricePerKg: number;
  laundryVatPercent: number;
  hourlyRate: number;
  onToggleDone: () => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
  onCloseCleaning: () => void;
  onCloseLaundry: () => void;
  onRenameGuest: (name: string | null) => void;
  onUpdateFee: (fee: number) => void;
  onUpdateHours: (hours: number) => void;
  onSaveOwnerInstructions: (patch: OwnerInstructionsPatch) => void;
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
    : task.external_source === 'vrbo_ical'
    ? 'VRBO'
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
        <OwnerInstructions
          task={task}
          villaRooms={roomOptions.length}
          laundryPricePerKg={laundryPricePerKg}
          laundryVatPercent={laundryVatPercent}
          hourlyRate={hourlyRate}
          onSave={onSaveOwnerInstructions}
        />
        <WhatsAppSendButton href={whatsAppHref} />
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
              <EditableFee
                value={Number(task.hours_worked ?? 0)}
                disabled={task.cleaning_paid}
                onSave={onUpdateHours}
              />{' '}h ·{' '}
              <EditableFee
                value={Number(task.cleaning_fee_snapshot)}
                disabled={task.cleaning_paid}
                onSave={onUpdateFee}
              />{' '}€
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
  whatsAppHref,
  roomOptions,
  laundryPricePerKg,
  laundryVatPercent,
  hourlyRate,
  onToggleDone,
  onMarkLaundry,
  onUnmarkLaundry,
  onCloseCleaning,
  onCloseLaundry,
  onRenameGuest,
  onUpdateFee,
  onUpdateHours,
  onSaveOwnerInstructions,
}: {
  task: CleaningTask;
  reference: string | null;
  seq: { isTurn: boolean };
  whatsAppHref: string | null;
  roomOptions: number[];
  laundryPricePerKg: number;
  laundryVatPercent: number;
  hourlyRate: number;
  onToggleDone: () => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
  onCloseCleaning: () => void;
  onCloseLaundry: () => void;
  onRenameGuest: (name: string | null) => void;
  onUpdateFee: (fee: number) => void;
  onUpdateHours: (hours: number) => void;
  onSaveOwnerInstructions: (patch: OwnerInstructionsPatch) => void;
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
    : task.external_source === 'vrbo_ical'
    ? 'VRBO'
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

      <OwnerInstructions
          task={task}
          villaRooms={roomOptions.length}
          laundryPricePerKg={laundryPricePerKg}
          laundryVatPercent={laundryVatPercent}
          hourlyRate={hourlyRate}
          onSave={onSaveOwnerInstructions}
        />
      <WhatsAppSendButton href={whatsAppHref} />

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
          <EditableFee
            value={Number(task.hours_worked ?? 0)}
            disabled={task.cleaning_paid}
            onSave={onUpdateHours}
          />{' '}h ·{' '}
          <EditableFee
            value={Number(task.cleaning_fee_snapshot)}
            disabled={task.cleaning_paid}
            onSave={onUpdateFee}
          />{' '}€
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

function EditableFee({
  value,
  disabled,
  onSave,
}: {
  value: number;
  disabled: boolean;
  onSave: (next: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value.toFixed(2));

  if (disabled) {
    return <span>{value.toFixed(2)}</span>;
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value.toFixed(2));
          setEditing(true);
        }}
        className="underline decoration-dotted decoration-gray-500/60 hover:text-yellow-300"
        title="Clica para alterar o preço"
      >
        {value.toFixed(2)}
      </button>
    );
  }

  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.5"
      min={0}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const n = Number(draft);
        if (Number.isFinite(n) && Math.abs(n - value) > 0.001) onSave(n);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setDraft(value.toFixed(2));
          setEditing(false);
        }
      }}
      className="w-16 px-1 py-0.5 rounded bg-white/10 border border-white/20 text-yellow-200 text-xs focus:outline-none focus:border-yellow-400/60"
    />
  );
}

function WhatsAppSendButton({ href }: { href: string | null }) {
  if (!href) {
    return (
      <p className="mt-1 text-[11px] text-gray-600" title="Definir em Preços e contactos">
        Sem nº da empregada
      </p>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border bg-emerald-500/10 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/20 transition-colors"
      title="Abre o WhatsApp com a mensagem já escrita — só tens de enviar"
    >
      <MessageCircle size={12} />
      Enviar por WhatsApp
    </a>
  );
}

function OwnerInstructions({
  task,
  villaRooms,
  laundryPricePerKg,
  laundryVatPercent,
  hourlyRate,
  onSave,
}: {
  task: CleaningTask;
  villaRooms: number;
  laundryPricePerKg: number;
  laundryVatPercent: number;
  hourlyRate: number;
  onSave: (patch: OwnerInstructionsPatch) => void;
}) {
  const initialNotes = (task.owner_notes || '').trim();
  const allOptions = useMemo(
    () => Array.from({ length: villaRooms }, (_, i) => i + 1),
    [villaRooms]
  );

  // The plan is people-per-room. Older tasks only carry rooms_to_prepare,
  // so read those as "room full" and let the host refine from there.
  const initialPlan = useMemo(() => {
    const plan: Record<number, number> = {};
    if (task.room_plan) {
      for (const [k, v] of Object.entries(task.room_plan)) {
        const n = Number(k);
        if (allOptions.includes(n)) plan[n] = Number(v) || 0;
      }
      return plan;
    }
    const legacy = Array.isArray(task.rooms_to_prepare) ? task.rooms_to_prepare : null;
    const rooms = legacy && legacy.length > 0 ? legacy : allOptions;
    for (const n of rooms) plan[n] = roomProfile(n).sleeps;
    return plan;
  }, [task.room_plan, task.rooms_to_prepare, allOptions]);

  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(initialNotes);
  const [plan, setPlan] = useState<Record<number, number>>(initialPlan);
  const [towels, setTowels] = useState<string>(
    task.towels_override != null ? String(task.towels_override) : ''
  );
  const [kind, setKind] = useState<'turnover' | 'midstay'>(task.kind ?? 'turnover');

  const guests = allOptions.reduce((sum, n) => sum + (plan[n] || 0), 0);
  const usedRooms = allOptions.filter((n) => (plan[n] || 0) > 0);
  const savedRooms = task.room_plan
    ? Object.entries(task.room_plan)
        .filter(([, v]) => Number(v) > 0)
        .map(([k]) => Number(k))
        .sort((a, b) => a - b)
    : Array.isArray(task.rooms_to_prepare)
    ? [...task.rooms_to_prepare].sort((a, b) => a - b)
    : [];
  const hasPartialRooms = savedRooms.length > 0 && savedRooms.length < villaRooms;
  const hasInstructions =
    initialNotes.length > 0 ||
    hasPartialRooms ||
    !!task.room_plan ||
    task.towels_override != null;

  function setRoom(n: number, people: number) {
    setPlan((prev) => ({
      ...prev,
      [n]: Math.max(0, Math.min(roomProfile(n).sleeps, people)),
    }));
  }

  function save() {
    const trimmed = notes.trim();
    const cleanPlan: Record<string, number> = {};
    for (const n of usedRooms) cleanPlan[String(n)] = plan[n];
    const parsedTowels = towels.trim() === '' ? null : Number(towels);
    onSave({
      kind,
      owner_notes: trimmed.length > 0 ? trimmed : null,
      // Kept in step with room_plan so anything still reading the older
      // column sees the same rooms.
      rooms_to_prepare: usedRooms.length > 0 ? usedRooms : null,
      room_plan: usedRooms.length > 0 ? cleanPlan : null,
      towels_override:
        parsedTowels != null && Number.isFinite(parsedTowels) && parsedTowels > 0
          ? parsedTowels
          : null,
    });
    setOpen(false);
  }

  function reset() {
    setNotes('');
    setPlan({});
    setTowels('');
    setKind('turnover');
    onSave({
      kind: 'turnover',
      owner_notes: null,
      rooms_to_prepare: null,
      room_plan: null,
      towels_override: null,
    });
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setNotes(initialNotes);
          setPlan(initialPlan);
          setTowels(task.towels_override != null ? String(task.towels_override) : '');
          setKind(task.kind ?? 'turnover');
          setOpen(true);
        }}
        className={`mt-1 inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md border transition-colors ${
          hasInstructions
            ? 'bg-amber-400/10 border-amber-400/40 text-amber-200 hover:bg-amber-400/20'
            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
        }`}
        title="Quem dorme onde, toalhas e notas para a limpeza"
      >
        {task.kind === 'midstay' ? '🧼 A meio da estadia' : '📝'}{' '}
        {task.kind === 'midstay' ? '' : hasInstructions ? 'Instruções' : 'Definir quartos'}
        {savedRooms.length > 0 && (
          <span>· {savedRooms.map((n) => shortRoom(n)).join(' + ')}</span>
        )}
        {task.towels_override != null && <span>· {task.towels_override} toalhas</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#16213e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-1">Instruções p/ limpeza</h2>
            <p className="text-xs text-gray-400 mb-4">
              {task.cleaning_date}
              {task.guest_name ? ` · ${task.guest_name}` : ''}
            </p>

            <span className="block text-xs text-gray-400 mb-2">Tipo de limpeza</span>
            <div className="flex items-center gap-2 mb-4">
              {(
                [
                  ['turnover', 'Completa (saída)'],
                  ['midstay', 'A meio da estadia'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setKind(value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    kind === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {kind === 'midstay' && (
              <p className="text-[11px] text-gray-500 mb-4">
                Só lençóis, toalhas e casas de banho. A mensagem avisa que os hóspedes
                estão na casa e que a hora é combinada com eles.
              </p>
            )}

            <span className="block text-xs text-gray-400 mb-2">
              {kind === 'midstay' ? 'Quartos onde trocar lençóis' : 'Quem dorme em cada quarto'}
            </span>
            <div className="space-y-2 mb-4">
              {allOptions.map((n) => {
                const profile = roomProfile(n);
                const people = plan[n] || 0;
                return (
                  <div
                    key={n}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                      people > 0
                        ? 'bg-amber-500/10 border-amber-400/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-white">
                        Q{n} {profile.name}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {profile.floor} · {profile.beds}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {Array.from({ length: profile.sleeps + 1 }, (_, i) => i).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setRoom(n, v)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                            people === v
                              ? 'bg-amber-500/40 text-amber-50 border border-amber-300/60'
                              : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                          }`}
                          title={v === 0 ? 'Não preparar este quarto' : `${v} pessoa(s)`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-start gap-3 mb-3">
              <label className="block w-28 shrink-0">
                <span className="block text-xs text-gray-400 mb-1">Toalhas</span>
                <input
                  type="number"
                  min={0}
                  value={towels}
                  onChange={(e) => setTowels(e.target.value)}
                  placeholder={String(guests)}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50"
                />
              </label>
              <p className="text-[11px] text-gray-500 pt-6">
                Vazio = uma por hóspede ({guests}). Escreve um número quando for
                diferente — ex.: 2 quartos e 4 toalhas.
              </p>
            </div>

            {usedRooms.length === 0 ? (
              <p className="text-[11px] text-gray-500 mb-4">
                Nenhum quarto escolhido — a mensagem pede a casa toda.
              </p>
            ) : (
              (() => {
                const towelCount = towels.trim() === '' ? guests : Number(towels) || 0;
                const fullTowels = villaRooms * 2;
                const planCost =
                  labourCost(usedRooms.length, hourlyRate, kind) +
                  laundryByWeight(usedRooms.length, towelCount, laundryPricePerKg, laundryVatPercent);
                const fullCost =
                  labourCost(villaRooms, hourlyRate, kind) +
                  laundryByWeight(villaRooms, fullTowels, laundryPricePerKg, laundryVatPercent);
                return (
                  <div className="mb-4 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                    <p className="text-[11px] text-gray-400">
                      {guests} hóspede(s) em {usedRooms.length} quarto(s). Os outros vão como
                      &quot;não mexer, fica só a coberta&quot;.
                    </p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {formatHours(personHours(usedRooms.length, kind))}-pessoa ·{' '}
                      {formatHours(wallClockHours(usedRooms.length, kind))} com {CLEANERS} pessoas
                      {' · '}
                      {laundryKg(usedRooms.length, towelCount).toFixed(1)} kg de roupa
                    </p>
                    <p className="text-[11px] text-gray-300 mt-1">
                      Limpeza {labourCost(usedRooms.length, hourlyRate, kind).toFixed(2)} € +
                      lavandaria{' '}
                      {laundryByWeight(
                        usedRooms.length,
                        towelCount,
                        laundryPricePerKg,
                        laundryVatPercent
                      ).toFixed(2)}{' '}
                      € = <span className="font-semibold">{planCost.toFixed(2)} €</span>
                    </p>
                    {usedRooms.length < villaRooms && (
                      <p className="text-[11px] text-emerald-300 mt-0.5">
                        Casa toda seriam {fullCost.toFixed(2)} € — poupas{' '}
                        {(fullCost - planCost).toFixed(2)} €
                      </p>
                    )}
                    <p className="text-[10px] text-gray-600 mt-1">
                      Estimativa tua, não vai na mensagem. O pagamento é pelas horas que ela
                      disser.
                    </p>
                  </div>
                );
              })()
            )}

            <label className="block mb-4">
              <span className="block text-xs text-gray-400 mb-1">Nota (opcional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="ex: Preparar berço no Principal. Chegam tarde."
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </label>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={reset}
                className="text-xs text-gray-500 hover:text-gray-300 underline"
              >
                Limpar instruções
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={save}
                  className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 text-sm font-medium"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
