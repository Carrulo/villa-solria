'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import { CheckCircle, XCircle, Filter, Plus, X as XIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface BlockedDateRow {
  id: string;
  date: string;
  source: string;
  note: string | null;
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [preset, setPreset] = useState<{ checkin_date?: string; checkout_date?: string }>({});

  useEffect(() => {
    fetchBookings();
    fetchBlockedDates();
  }, []);

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    setBookings((data || []) as Booking[]);
    setLoading(false);
  }

  async function fetchBlockedDates() {
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('blocked_dates')
      .select('id, date, source, note')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(2000);
    setBlockedDates((data || []) as BlockedDateRow[]);
  }

  async function updateStatus(id: string, status: 'confirmed' | 'cancelled') {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id);

    if (error) {
      showToast('Erro ao atualizar estado', 'error');
      return;
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    showToast(`Reserva ${status === 'confirmed' ? 'confirmada' : 'cancelada'}`, 'success');
  }

  const [refunding, setRefunding] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<Booking | null>(null);

  async function handleRefund(id: string) {
    setRefunding(id);
    try {
      const res = await fetch('/api/bookings/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: id }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Erro ao reembolsar', 'error');
        return;
      }

      setBookings((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, status: 'cancelled' as const, payment_status: 'refunded' as const } : b
        )
      );
      showToast(`Reembolso de ${data.amount}€ processado com sucesso`, 'success');
    } catch {
      showToast('Erro de rede ao processar reembolso', 'error');
    } finally {
      setRefunding(null);
      setRefundTarget(null);
    }
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filteredBookings = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) {
    return <div className="text-gray-400">A carregar reservas...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Refund confirmation modal */}
      {refundTarget && (
        <RefundConfirmModal
          booking={refundTarget}
          isProcessing={refunding === refundTarget.id}
          onCancel={() => setRefundTarget(null)}
          onConfirm={() => handleRefund(refundTarget.id)}
        />
      )}

      {showManualModal && (
        <ManualBookingModal
          preset={preset}
          onCancel={() => {
            setShowManualModal(false);
            setPreset({});
          }}
          onCreated={async () => {
            setShowManualModal(false);
            setPreset({});
            await fetchBookings();
            await fetchBlockedDates();
            showToast('Reserva manual criada', 'success');
          }}
          onError={(msg) => showToast(msg, 'error')}
        />
      )}

      {/* Header + Filter */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-white">Reservas</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium"
          >
            <Plus size={14} /> Reserva manual
          </button>
          <Filter size={16} className="text-gray-400" />
          {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((f) => {
            const labels: Record<string, string> = { all: 'Todos', pending: 'Pendente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
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
              {labels[f]}
            </button>
            );
          })}
        </div>
      </div>

      {/* Availability calendar (month view) */}
      <AvailabilityCalendar
        blocked={blockedDates}
        onPickRange={(checkin, checkout) => {
          setPreset({ checkin_date: checkin, checkout_date: checkout });
          setShowManualModal(true);
        }}
      />

      {/* Table */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4">Ref.</th>
                <th className="px-6 py-4">Hóspede</th>
                <th className="px-6 py-4">Datas</th>
                <th className="px-6 py-4">Noites</th>
                <th className="px-6 py-4">Hóspedes</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Pagamento</th>
                <th className="px-6 py-4">Origem</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    Nenhuma reserva encontrada
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking, i) => (
                  <tr key={booking.id} className={`hover:bg-white/[0.02] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono font-semibold text-blue-400">
                        {(booking as Booking & { reference?: string }).reference || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{booking.guest_name}</p>
                        <p className="text-xs text-gray-500">{booking.guest_email}</p>
                        {booking.guest_phone && <p className="text-xs text-gray-500">{booking.guest_phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-300">{booking.checkin_date}</p>
                      <p className="text-xs text-gray-500">até {booking.checkout_date}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{booking.num_nights}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{booking.num_guests}</td>
                    <td className="px-6 py-4 text-sm text-white font-medium">{booking.total_price}EUR</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.payment_status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{booking.source}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateStatus(booking.id, 'confirmed')}
                              className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors"
                              title="Confirmar"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => updateStatus(booking.id, 'cancelled')}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              title="Cancelar"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateStatus(booking.id, 'cancelled')}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Cancelar"
                          >
                            <XCircle size={16} />
                          </button>
                        )}
                        {booking.payment_status === 'paid' && (
                          <button
                            onClick={() => setRefundTarget(booking)}
                            disabled={refunding === booking.id}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors text-xs font-medium disabled:opacity-50"
                            title="Reembolsar via Stripe"
                          >
                            {refunding === booking.id ? '...' : 'Refund'}
                          </button>
                        )}
                        {booking.payment_status === 'refunded' && (
                          <span className="text-xs text-gray-500">Reembolsado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RefundConfirmModal({
  booking,
  isProcessing,
  onCancel,
  onConfirm,
}: {
  booking: Booking;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const expected = (booking as Booking & { reference?: string }).reference || booking.guest_email;
  const expectedLabel = (booking as Booking & { reference?: string }).reference
    ? 'referência da reserva'
    : 'email do hóspede';
  const [typed, setTyped] = useState('');
  const matches = typed.trim() === expected;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#16213e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Confirmar Reembolso</h2>
        <p className="text-xs text-red-400 mb-4">
          Esta ação é irreversível. O valor será devolvido ao cliente via Stripe.
        </p>

        <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Hóspede</span>
            <span className="text-white font-medium">{booking.guest_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Email</span>
            <span className="text-gray-300">{booking.guest_email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Datas</span>
            <span className="text-gray-300">
              {booking.checkin_date} → {booking.checkout_date}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total</span>
            <span className="text-white font-semibold">{booking.total_price}EUR</span>
          </div>
        </div>

        <label className="block text-xs text-gray-400 mb-2">
          Para confirmar, escreva a {expectedLabel}:{' '}
          <span className="text-purple-300 font-mono select-all">{expected}</span>
        </label>
        <input
          type="text"
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={isProcessing}
          placeholder={expected}
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
        />

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches || isProcessing}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'A processar...' : `Reembolsar ${booking.total_price}EUR`}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvailabilityCalendar({
  blocked,
  onPickRange,
}: {
  blocked: BlockedDateRow[];
  onPickRange: (checkin: string, checkout: string) => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }, []);
  const [cursor, setCursor] = useState(() => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)));
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const blockedMap = useMemo(() => {
    const m = new Map<string, BlockedDateRow>();
    for (const b of blocked) m.set(b.date, b);
    return m;
  }, [blocked]);

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const monthLabel = cursor.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  // Build a 6-row grid aligned to Monday.
  const cells: { iso: string; inMonth: boolean }[] = useMemo(() => {
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const weekday = (firstOfMonth.getUTCDay() + 6) % 7; // 0=Mon
    const gridStart = new Date(firstOfMonth);
    gridStart.setUTCDate(gridStart.getUTCDate() - weekday);
    const out: { iso: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setUTCDate(d.getUTCDate() + i);
      out.push({
        iso: d.toISOString().slice(0, 10),
        inMonth: d.getUTCMonth() === month,
      });
    }
    return out;
  }, [year, month]);

  function sourceStyle(src: string) {
    switch (src) {
      case 'airbnb_ical':
        return 'bg-pink-500/25 border-pink-400/40 text-pink-100';
      case 'booking_ical':
        return 'bg-blue-500/25 border-blue-400/40 text-blue-100';
      case 'website':
        return 'bg-emerald-500/25 border-emerald-400/40 text-emerald-100';
      default:
        return 'bg-gray-500/25 border-gray-400/40 text-gray-100';
    }
  }

  function onDayClick(iso: string) {
    const isBlocked = blockedMap.has(iso);
    if (isBlocked) return;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(iso);
      setRangeEnd(null);
    } else if (iso <= rangeStart) {
      setRangeStart(iso);
      setRangeEnd(null);
    } else {
      setRangeEnd(iso);
    }
  }

  function inSelection(iso: string): boolean {
    if (!rangeStart) return false;
    const end = rangeEnd || rangeStart;
    return iso >= rangeStart && iso <= end;
  }

  const nights = rangeStart && rangeEnd
    ? Math.round(
        (new Date(rangeEnd + 'T00:00:00Z').getTime() -
          new Date(rangeStart + 'T00:00:00Z').getTime()) / 86400000
      )
    : 0;

  return (
    <div className="bg-[#16213e] rounded-2xl border border-white/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Disponibilidade
          </h2>
          <span className="text-xs text-gray-500 capitalize">· {monthLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setCursor(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)))}
            className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs"
          >
            Hoje
          </button>
          <button
            onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"
            aria-label="Mês seguinte"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase tracking-wider text-gray-500 mb-1">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map(({ iso, inMonth }) => {
          const b = blockedMap.get(iso);
          const isBlocked = !!b;
          const isToday = iso === today.toISOString().slice(0, 10);
          const inSel = inSelection(iso);
          const sourceCls = isBlocked ? sourceStyle(b.source) : 'border-transparent';
          return (
            <button
              key={iso}
              onClick={() => onDayClick(iso)}
              disabled={!inMonth || isBlocked}
              title={b ? `${iso} · ${b.source}${b.note ? ' · ' + b.note : ''}` : iso}
              className={`relative aspect-square rounded-lg text-xs border transition-colors flex flex-col items-center justify-center
                ${inMonth ? '' : 'opacity-30'}
                ${isBlocked ? sourceCls + ' cursor-not-allowed' : 'bg-white/5 border-white/10 text-gray-200 hover:bg-emerald-500/20'}
                ${inSel && !isBlocked ? '!bg-emerald-500/40 !border-emerald-300/60 !text-white' : ''}
                ${isToday ? 'ring-1 ring-amber-400/60' : ''}`}
            >
              <span className="font-medium">{parseInt(iso.slice(8, 10), 10)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
        <div className="flex items-center gap-3 text-[11px] text-gray-400 flex-wrap">
          <Legend color="bg-white/5 border-white/10" label="livre" />
          <Legend color="bg-emerald-500/25 border-emerald-400/40" label="site" />
          <Legend color="bg-pink-500/25 border-pink-400/40" label="Airbnb" />
          <Legend color="bg-blue-500/25 border-blue-400/40" label="Booking" />
        </div>

        {rangeStart && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">
              {rangeStart}
              {rangeEnd ? ` → ${rangeEnd} · ${nights} noite${nights !== 1 ? 's' : ''}` : ' · escolhe saída'}
            </span>
            {rangeEnd && (
              <button
                onClick={() => onPickRange(rangeStart, rangeEnd)}
                className="px-3 py-1 rounded bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Criar reserva
              </button>
            )}
            <button
              onClick={() => {
                setRangeStart(null);
                setRangeEnd(null);
              }}
              className="px-2 py-1 rounded bg-white/5 text-gray-400 hover:bg-white/10"
            >
              limpar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded border ${color}`} />
      {label}
    </span>
  );
}

function ManualBookingModal({
  preset,
  onCancel,
  onCreated,
  onError,
}: {
  preset?: { checkin_date?: string; checkout_date?: string };
  onCancel: () => void;
  onCreated: () => Promise<void> | void;
  onError: (msg: string) => void;
}) {
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [checkin, setCheckin] = useState(
    () => preset?.checkin_date || new Date().toISOString().slice(0, 10)
  );
  const [checkout, setCheckout] = useState(() => preset?.checkout_date || '');
  const [numGuests, setNumGuests] = useState(2);
  const [totalPrice, setTotalPrice] = useState(0);
  const [deposit, setDeposit] = useState(0);
  const [notes, setNotes] = useState('');
  const [midStays, setMidStays] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const numNights = useMemo(() => {
    if (!checkin || !checkout) return 0;
    const a = new Date(checkin + 'T00:00:00Z').getTime();
    const b = new Date(checkout + 'T00:00:00Z').getTime();
    const n = Math.round((b - a) / 86400000);
    return n > 0 ? n : 0;
  }, [checkin, checkout]);

  // Suggest mid-stay cleanings:
  //   nights 11-20 → 1 Saturday in the middle (or nearest Saturday to midpoint)
  //   nights 21+   → every 7 days from check-in
  const suggested = useMemo<string[]>(() => {
    if (!checkin || !checkout || numNights < 11) return [];
    const start = new Date(checkin + 'T00:00:00Z');
    const end = new Date(checkout + 'T00:00:00Z');

    if (numNights >= 21) {
      const out: string[] = [];
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + 7);
      while (d < end) {
        out.push(d.toISOString().slice(0, 10));
        d.setUTCDate(d.getUTCDate() + 7);
      }
      return out;
    }

    // 11-20 nights: pick the Saturday closest to the midpoint.
    const saturdays: string[] = [];
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + 1);
    while (d < end) {
      if (d.getUTCDay() === 6) saturdays.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 1);
    }
    if (saturdays.length === 0) {
      const mid = new Date(start);
      mid.setUTCDate(mid.getUTCDate() + Math.floor(numNights / 2));
      return [mid.toISOString().slice(0, 10)];
    }
    const midpointTime = (start.getTime() + end.getTime()) / 2;
    const best = saturdays.reduce((a, b) =>
      Math.abs(new Date(a + 'T00:00:00Z').getTime() - midpointTime) <
      Math.abs(new Date(b + 'T00:00:00Z').getTime() - midpointTime)
        ? a
        : b
    );
    return [best];
  }, [checkin, checkout, numNights]);

  useEffect(() => {
    setMidStays(new Set(suggested));
  }, [suggested]);

  function toggleMid(d: string) {
    setMidStays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  async function submit() {
    if (!guestName.trim()) {
      onError('Nome obrigatório');
      return;
    }
    if (!checkin || !checkout || numNights <= 0) {
      onError('Datas inválidas');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_name: guestName,
          guest_phone: phone,
          guest_email: email,
          checkin_date: checkin,
          checkout_date: checkout,
          num_guests: numGuests,
          total_price: totalPrice,
          deposit_paid: deposit,
          notes,
          mid_stay_dates: Array.from(midStays),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || 'Erro ao criar reserva');
        return;
      }
      await onCreated();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#16213e] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Reserva manual</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white">
            <XIcon size={18} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nome *">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className={fieldCls}
              placeholder="Carolina Silva"
            />
          </Field>
          <Field label="Telefone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={fieldCls}
              placeholder="+351 912 345 678"
            />
          </Field>
          <Field label="Email (opcional)" className="sm:col-span-2">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldCls}
              placeholder="email@example.com"
            />
          </Field>
          <Field label="Entrada *">
            <input
              type="date"
              value={checkin}
              onChange={(e) => setCheckin(e.target.value)}
              className={fieldCls}
            />
          </Field>
          <Field label="Saída *">
            <input
              type="date"
              value={checkout}
              onChange={(e) => setCheckout(e.target.value)}
              className={fieldCls}
            />
          </Field>
          <Field label="Hóspedes">
            <input
              type="number"
              min={1}
              value={numGuests}
              onChange={(e) => setNumGuests(Math.max(1, Number(e.target.value) || 1))}
              className={fieldCls}
            />
          </Field>
          <Field label={`Noites (auto)`}>
            <input value={numNights} disabled className={fieldCls + ' opacity-60'} />
          </Field>
          <Field label="Preço total (€)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={totalPrice}
              onChange={(e) => setTotalPrice(Number(e.target.value) || 0)}
              className={fieldCls}
            />
          </Field>
          <Field label="Sinal pago (€)">
            <input
              type="number"
              min={0}
              step="0.01"
              value={deposit}
              onChange={(e) => setDeposit(Number(e.target.value) || 0)}
              className={fieldCls}
            />
          </Field>
          <Field label="Notas (opcional)" className="sm:col-span-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className={fieldCls + ' resize-none'}
              placeholder="ex: 1450€/semana, pagamento restante em mãos à chegada"
            />
          </Field>
        </div>

        {numNights >= 11 && (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl p-3">
            <p className="text-xs text-gray-400 mb-2">
              Limpezas intermédias (estadias longas — sugestão automática)
            </p>
            <div className="flex flex-wrap gap-2">
              {suggested.map((d) => (
                <label
                  key={d}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs cursor-pointer border ${
                    midStays.has(d)
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                      : 'bg-white/5 border-white/10 text-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={midStays.has(d)}
                    onChange={() => toggleMid(d)}
                    className="w-3 h-3"
                  />
                  {d} ({weekdayShort(d)})
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Cria tarefas de limpeza adicionais nestas datas (sem custo para o hóspede).
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || !guestName.trim() || numNights <= 0}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'A criar...' : 'Criar reserva'}
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldCls =
  'w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50';

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className || ''}`}>
      <span className="block text-xs text-gray-400 mb-1">{label}</span>
      {children}
    </label>
  );
}

function weekdayShort(iso: string): string {
  const labels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return labels[new Date(iso + 'T00:00:00Z').getUTCDay()];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    paid: 'bg-green-500/10 text-green-400 border-green-500/20',
    refunded: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  };

  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
