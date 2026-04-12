'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import { CheckCircle, XCircle, Filter, CalendarX } from 'lucide-react';

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
      .in('source', ['airbnb_ical', 'booking_ical'])
      .order('date', { ascending: true })
      .limit(500);
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

      {/* Header + Filter */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Reservas</h1>
        <div className="flex items-center gap-2">
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

      {/* Blocked dates from external iCal */}
      {blockedDates.length > 0 && (
        <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarX size={16} className="text-amber-400" />
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Datas Bloqueadas (iCal Externo)
            </h2>
            <span className="text-xs text-gray-500">{blockedDates.length} dias</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {blockedDates.slice(0, 120).map((bd) => {
              const sourceColor =
                bd.source === 'airbnb_ical'
                  ? 'bg-pink-500/10 text-pink-300 border-pink-500/20'
                  : 'bg-blue-500/10 text-blue-300 border-blue-500/20';
              const label = bd.source === 'airbnb_ical' ? 'Airbnb' : 'Booking';
              return (
                <span
                  key={bd.id}
                  title={bd.note || ''}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${sourceColor}`}
                >
                  {bd.date}
                  <span className="opacity-60">·</span>
                  <span className="opacity-80">{label}</span>
                </span>
              );
            })}
            {blockedDates.length > 120 && (
              <span className="text-xs text-gray-500 self-center">
                +{blockedDates.length - 120} mais...
              </span>
            )}
          </div>
        </div>
      )}

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
