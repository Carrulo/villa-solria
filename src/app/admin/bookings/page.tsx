'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import { CheckCircle, XCircle, Filter } from 'lucide-react';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  async function fetchBookings() {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    setBookings((data || []) as Booking[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: 'confirmed' | 'cancelled') {
    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', id);

    if (error) {
      showToast('Failed to update status', 'error');
      return;
    }

    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    showToast(`Booking ${status}`, 'success');
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const filteredBookings = filter === 'all' ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) {
    return <div className="text-gray-400">Loading bookings...</div>;
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
        <h1 className="text-2xl font-bold text-white">Bookings</h1>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          {['all', 'pending', 'confirmed', 'cancelled'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-white/5">
                <th className="px-6 py-4">Guest</th>
                <th className="px-6 py-4">Dates</th>
                <th className="px-6 py-4">Nights</th>
                <th className="px-6 py-4">Guests</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Payment</th>
                <th className="px-6 py-4">Source</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking, i) => (
                  <tr key={booking.id} className={`hover:bg-white/[0.02] ${i % 2 === 1 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{booking.guest_name}</p>
                        <p className="text-xs text-gray-500">{booking.guest_email}</p>
                        {booking.guest_phone && <p className="text-xs text-gray-500">{booking.guest_phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-300">{booking.check_in}</p>
                      <p className="text-xs text-gray-500">to {booking.check_out}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{booking.nights}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{booking.guests}</td>
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
                              title="Confirm"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => updateStatus(booking.id, 'cancelled')}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                              title="Cancel"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateStatus(booking.id, 'cancelled')}
                            className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Cancel"
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
