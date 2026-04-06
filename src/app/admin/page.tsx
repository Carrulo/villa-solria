'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import { CalendarDays, TrendingUp, Users, Percent, ArrowRight } from 'lucide-react';

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    revenueMonth: 0,
    occupancy: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: allBookings } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    const bks = (allBookings || []) as Booking[];
    setBookings(bks);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const upcoming = bks.filter((b) => b.check_in >= now.toISOString().split('T')[0] && b.status !== 'cancelled');
    const monthBookings = bks.filter((b) => b.created_at >= monthStart && b.status !== 'cancelled');
    const revenueMonth = monthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

    // Simple occupancy: booked nights this month / days in month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const bookedNightsMonth = monthBookings.reduce((sum, b) => sum + (b.nights || 0), 0);
    const occupancy = Math.min(100, Math.round((bookedNightsMonth / daysInMonth) * 100));

    setStats({
      total: bks.length,
      upcoming: upcoming.length,
      revenueMonth,
      occupancy,
    });
    setLoading(false);
  }

  const statCards = [
    { label: 'Total de Reservas', value: stats.total, icon: CalendarDays, color: 'text-blue-400' },
    { label: 'Próximas', value: stats.upcoming, icon: Users, color: 'text-green-400' },
    { label: 'Receita (Mês)', value: `${stats.revenueMonth.toFixed(0)}EUR`, icon: TrendingUp, color: 'text-yellow-400' },
    { label: 'Taxa de Ocupação', value: `${stats.occupancy}%`, icon: Percent, color: 'text-purple-400' },
  ];

  const recentBookings = bookings.slice(0, 5);

  if (loading) {
    return <div className="text-gray-400">A carregar painel...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-[#16213e] rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <card.icon size={24} className={card.color} />
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Reservas Recentes</h2>
          <a href="/admin/bookings" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Ver todas <ArrowRight size={14} />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-3">Hóspede</th>
                <th className="px-6 py-3">Check-in</th>
                <th className="px-6 py-3">Noites</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Ainda sem reservas
                  </td>
                </tr>
              ) : (
                recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">{booking.guest_name}</p>
                        <p className="text-xs text-gray-500">{booking.guest_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{booking.check_in}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{booking.nights}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{booking.total_price}EUR</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href="/admin/pricing"
          className="bg-[#16213e] rounded-2xl p-6 border border-white/5 hover:border-blue-500/30 transition-colors group"
        >
          <h3 className="text-white font-medium mb-1 group-hover:text-blue-400 transition-colors">Gerir Épocas</h3>
          <p className="text-sm text-gray-400">Adicionar ou editar épocas de preços</p>
        </a>
        <a
          href="/admin/reviews"
          className="bg-[#16213e] rounded-2xl p-6 border border-white/5 hover:border-blue-500/30 transition-colors group"
        >
          <h3 className="text-white font-medium mb-1 group-hover:text-blue-400 transition-colors">Gerir Avaliações</h3>
          <p className="text-sm text-gray-400">Adicionar ou gerir avaliações de hóspedes</p>
        </a>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
