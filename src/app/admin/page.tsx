'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import {
  CalendarDays,
  TrendingUp,
  Users,
  Percent,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { countryFlag } from '@/lib/countries';

interface BlockedDate {
  date: string;
  source: string;
}

function monthIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}
function nightsBetween(from: string, to: string): number {
  return Math.round(
    (new Date(to + 'T00:00:00Z').getTime() - new Date(from + 'T00:00:00Z').getTime()) / 86400000,
  );
}
function overlapNights(checkin: string, checkout: string, monthStart: string, monthEndExclusive: string): number {
  const a = checkin > monthStart ? checkin : monthStart;
  const b = checkout < monthEndExclusive ? checkout : monthEndExclusive;
  const n = nightsBetween(a, b);
  return Math.max(0, n);
}

export default function AdminDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
  });

  useEffect(() => {
    (async () => {
      const [{ data: bks }, { data: bd }] = await Promise.all([
        supabase.from('bookings').select('*').order('created_at', { ascending: false }),
        supabase.from('blocked_dates').select('date, source'),
      ]);
      setBookings((bks || []) as Booking[]);
      setBlocked((bd || []) as BlockedDate[]);
      setLoading(false);
    })();
  }, []);

  const monthStart = monthIso(cursor.year, cursor.month, 1);
  const monthEndExclusive = monthIso(cursor.year, cursor.month + 1, 1);
  const daysInMonth = nightsBetween(monthStart, monthEndExclusive);
  const monthLabel = new Date(Date.UTC(cursor.year, cursor.month, 1)).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const stats = useMemo(() => {
    const active = bookings.filter((b) => b.status !== 'cancelled');
    const todayIso = new Date().toISOString().slice(0, 10);

    // Stays that touch the month (checkin < end AND checkout > start)
    const monthStays = active.filter(
      (b) => b.checkin_date < monthEndExclusive && b.checkout_date > monthStart,
    );

    // Channel breakdown for the month
    const byChannel: Record<string, { count: number; nights: number; revenue: number }> = {
      website: { count: 0, nights: 0, revenue: 0 },
      manual: { count: 0, nights: 0, revenue: 0 },
    };
    let directNights = 0;
    let directRevenue = 0;
    for (const b of monthStays) {
      const src = (b.source || 'website') as string;
      if (!byChannel[src]) byChannel[src] = { count: 0, nights: 0, revenue: 0 };
      const n = overlapNights(b.checkin_date, b.checkout_date, monthStart, monthEndExclusive);
      byChannel[src].count += 1;
      byChannel[src].nights += n;
      const rev = b.total_price
        ? (b.total_price * n) / Math.max(1, b.num_nights || n)
        : 0;
      byChannel[src].revenue += rev;
      directNights += n;
      directRevenue += rev;
    }

    // iCal blocks that fall in this month (Airbnb + Booking)
    const airbnbBlocked = blocked.filter(
      (b) => b.source === 'airbnb_ical' && b.date >= monthStart && b.date < monthEndExclusive,
    ).length;
    const bookingBlocked = blocked.filter(
      (b) => b.source === 'booking_ical' && b.date >= monthStart && b.date < monthEndExclusive,
    ).length;

    const occupiedNights = Math.min(daysInMonth, directNights + airbnbBlocked + bookingBlocked);
    const occupancy = Math.round((occupiedNights / daysInMonth) * 100);

    const upcoming7d = active.filter(
      (b) => b.checkin_date >= todayIso && b.checkin_date <= monthIso(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate() + 7,
      ),
    ).length;

    return {
      monthStays: monthStays.length,
      directNights,
      directRevenue: Math.round(directRevenue),
      airbnbBlocked,
      bookingBlocked,
      occupiedNights,
      occupancy,
      byChannel,
      upcoming7d,
      daysInMonth,
    };
  }, [bookings, blocked, monthStart, monthEndExclusive, daysInMonth]);

  const recentBookings = bookings
    .filter((b) => b.status !== 'cancelled')
    .slice(0, 5);

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(Date.UTC(c.year, c.month + delta, 1));
      return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
    });
  }
  function resetToThisMonth() {
    const d = new Date();
    setCursor({ year: d.getUTCFullYear(), month: d.getUTCMonth() });
  }

  if (loading) {
    return <div className="text-gray-400">A carregar painel...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Month selector */}
      <div className="bg-[#16213e] border border-white/5 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white capitalize">{monthLabel}</h1>
          <p className="text-xs text-gray-400 mt-1">
            {stats.monthStays} reserva{stats.monthStays === 1 ? '' : 's'} direta{stats.monthStays === 1 ? '' : 's'} · {stats.occupiedNights}/{stats.daysInMonth} noites ocupadas
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => shiftMonth(-1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"><ChevronLeft size={16} /></button>
          <button onClick={resetToThisMonth} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium">Este mês</button>
          <button onClick={() => shiftMonth(1)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<CalendarDays size={22} className="text-blue-400" />}
          label="Reservas directas (mês)"
          value={stats.monthStays.toString()}
          hint={`${stats.directNights} noites`}
        />
        <StatCard
          icon={<Users size={22} className="text-green-400" />}
          label="Próximos 7 dias"
          value={stats.upcoming7d.toString()}
          hint="check-ins"
        />
        <StatCard
          icon={<TrendingUp size={22} className="text-yellow-400" />}
          label="Receita directa (mês)"
          value={`${stats.directRevenue}EUR`}
          hint="pro-rata por noites no mês"
        />
        <StatCard
          icon={<Percent size={22} className="text-purple-400" />}
          label="Ocupação (mês)"
          value={`${stats.occupancy}%`}
          hint={`${stats.occupiedNights}/${stats.daysInMonth} noites (inclui iCal)`}
        />
      </div>

      {/* Channel breakdown */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-blue-300" />
          <h2 className="text-sm font-semibold text-white">Canais (noites no mês)</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ChannelCard
            label="Site"
            nights={stats.byChannel.website?.nights || 0}
            count={stats.byChannel.website?.count || 0}
            color="bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
          />
          <ChannelCard
            label="Manual"
            nights={stats.byChannel.manual?.nights || 0}
            count={stats.byChannel.manual?.count || 0}
            color="bg-sky-500/20 text-sky-300 border-sky-500/30"
          />
          <ChannelCard
            label="Airbnb (bloqueio)"
            nights={stats.airbnbBlocked}
            color="bg-pink-500/20 text-pink-300 border-pink-500/30"
          />
          <ChannelCard
            label="Booking (bloqueio)"
            nights={stats.bookingBlocked}
            color="bg-blue-500/20 text-blue-300 border-blue-500/30"
          />
        </div>
        <p className="text-[11px] text-gray-500 mt-3">
          * Airbnb/Booking aparecem como noites bloqueadas via iCal — não temos a receita dessas reservas na BD, por isso não entram em "Receita directa". Janela máxima de reserva Airbnb = 6 meses.
        </p>
      </div>

      {/* Recent bookings */}
      <div className="bg-[#16213e] rounded-2xl border border-white/5">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Reservas recentes</h2>
          <a href="/admin/bookings" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
            Ver todas <ArrowRight size={14} />
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-400 uppercase tracking-wider">
                <th className="px-6 py-3">Hóspede</th>
                <th className="px-6 py-3 hidden sm:table-cell">Origem</th>
                <th className="px-6 py-3">Check-in</th>
                <th className="px-6 py-3 hidden sm:table-cell">Noites</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Ainda sem reservas
                  </td>
                </tr>
              ) : (
                recentBookings.map((booking) => {
                  const country = (booking as Booking & { guest_country?: string | null }).guest_country || null;
                  return (
                    <tr key={booking.id} className="hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {country && <span className="text-base leading-none">{countryFlag(country)}</span>}
                          <div>
                            <p className="text-sm font-medium text-white">{booking.guest_name}</p>
                            <p className="text-xs text-gray-500">{booking.guest_email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400 hidden sm:table-cell">{booking.source || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{booking.checkin_date}</td>
                      <td className="px-6 py-4 text-sm text-gray-300 hidden sm:table-cell">{booking.num_nights}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{booking.total_price}EUR</td>
                      <td className="px-6 py-4"><StatusBadge status={booking.status} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-[#16213e] rounded-2xl p-6 border border-white/5">
      <div className="flex items-center justify-between mb-4">{icon}</div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{label}</p>
      {hint && <p className="text-[11px] text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function ChannelCard({
  label,
  nights,
  count,
  color,
}: {
  label: string;
  nights: number;
  count?: number;
  color: string;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${color}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold mt-1">{nights}<span className="text-xs font-normal opacity-70 ml-1">noites</span></p>
      {typeof count === 'number' && <p className="text-[11px] opacity-70 mt-0.5">{count} reserva{count === 1 ? '' : 's'}</p>}
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
