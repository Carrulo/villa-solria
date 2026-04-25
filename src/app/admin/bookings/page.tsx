'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import { CheckCircle, XCircle, Filter, Plus, X as XIcon, ChevronLeft, ChevronRight, StickyNote, Trash2, Link as LinkIcon, Unlink } from 'lucide-react';
import { COUNTRIES, countryToLanguage, countryFlag } from '@/lib/countries';

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
  const [checkinDays, setCheckinDays] = useState<Set<string>>(new Set());
  const [checkoutDays, setCheckoutDays] = useState<Set<string>>(new Set());
  const [sourceByDate, setSourceByDate] = useState<Record<string, string>>({});
  const [guestByDate, setGuestByDate] = useState<Record<string, string>>({});
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [linkTarget, setLinkTarget] = useState<Booking | null>(null);

  type ExternalMeta = {
    _external?: boolean;
    _externalSource?: 'airbnb_ical' | 'booking_ical';
    _externalRef?: string;
    _linkedToBookingId?: string | null;
    _linkedToExternalSource?: 'airbnb_ical' | 'booking_ical' | null;
    _linkedToExternalRef?: string | null;
    _childCount?: number;
  };

  async function linkOne(externalBooking: Booking, parent: Booking | null) {
    const meta = externalBooking as Booking & ExternalMeta;
    if (!meta._externalSource || !meta._externalRef) return null;
    const parentMeta = parent as (Booking & ExternalMeta) | null;
    const payload: Record<string, string | null> = {
      external_source: meta._externalSource,
      external_ref: meta._externalRef,
      linked_to_booking_id: null,
      linked_to_external_source: null,
      linked_to_external_ref: null,
    };
    if (parent) {
      if (parentMeta?._external && parentMeta._externalSource && parentMeta._externalRef) {
        payload.linked_to_external_source = parentMeta._externalSource;
        payload.linked_to_external_ref = parentMeta._externalRef;
      } else {
        payload.linked_to_booking_id = parent.id;
      }
    }
    const res = await fetch('/api/bookings/link-external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.error || 'Erro a ligar reserva';
    }
    return null;
  }

  async function linkExternal(
    externalBooking: Booking,
    parent: Booking | null,
    siblings: Booking[] = []
  ) {
    const meta = externalBooking as Booking & ExternalMeta;
    // Desligar on a head row (no own link, but groups others) → sweep
    // the children's links instead.
    if (
      !parent &&
      siblings.length === 0 &&
      !meta._linkedToBookingId &&
      !meta._linkedToExternalRef &&
      (meta._childCount ?? 0) > 0 &&
      meta._externalSource &&
      meta._externalRef
    ) {
      const children = bookings.filter((b) => {
        const m = b as Booking & ExternalMeta;
        return (
          m._external &&
          m._linkedToExternalSource === meta._externalSource &&
          m._linkedToExternalRef === meta._externalRef
        );
      });
      for (const c of children) await linkOne(c, null);
      showToast(`${children.length} ligaç${children.length > 1 ? 'ões' : 'ão'} removidas`, 'success');
      setLinkTarget(null);
      await fetchBookings();
      await fetchBlockedDates();
      return;
    }
    const errors: string[] = [];
    if (parent) {
      // Website parent: link source + all siblings to it.
      const targets = [externalBooking, ...siblings];
      for (const t of targets) {
        const err = await linkOne(t, parent);
        if (err) errors.push(err);
      }
    } else if (siblings.length > 0) {
      // No website parent: source itself becomes the head, siblings
      // point at it. Source's own link is cleared so it stays a root.
      const clearErr = await linkOne(externalBooking, null);
      if (clearErr) errors.push(clearErr);
      for (const s of siblings) {
        const err = await linkOne(s, externalBooking);
        if (err) errors.push(err);
      }
    } else {
      // Plain unlink of the source.
      const err = await linkOne(externalBooking, null);
      if (err) errors.push(err);
    }
    if (errors.length) {
      showToast(errors[0], 'error');
    } else {
      const total = parent ? siblings.length + 1 : siblings.length + 1;
      showToast(
        parent || siblings.length > 0
          ? `${total} reservas agrupadas`
          : 'Link removido',
        'success'
      );
    }
    setLinkTarget(null);
    await fetchBookings();
    await fetchBlockedDates();
  }

  async function handleDelete(booking: Booking, confirmation: string) {
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation }),
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Erro ao apagar', 'error');
      return false;
    }
    setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    await fetchBlockedDates();
    showToast('Reserva apagada', 'success');
    return true;
  }

  const bookingByDate = useMemo(() => {
    const map: Record<string, Booking> = {};
    for (const b of bookings) {
      if (!b.checkin_date || !b.checkout_date) continue;
      if (b.status === 'cancelled') continue;
      const cur = new Date(b.checkin_date + 'T00:00:00Z');
      const end = new Date(b.checkout_date + 'T00:00:00Z');
      while (cur <= end) {
        const iso = cur.toISOString().slice(0, 10);
        if (!map[iso]) map[iso] = b;
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    }
    return map;
  }, [bookings]);

  useEffect(() => {
    fetchBookings();
    fetchBlockedDates();
  }, []);

  async function fetchBookings() {
    const [{ data: own }, { data: external }] = await Promise.all([
      supabase.from('bookings').select('*'),
      supabase
        .from('cleaning_tasks')
        .select(
          'external_source, external_ref, checkin_date, stay_checkout_date, guest_name, num_guests, created_at, linked_to_booking_id, linked_to_external_source, linked_to_external_ref'
        )
        .not('external_source', 'is', null),
    ]);

    const ownBookings = (own || []) as Booking[];
    const ownById = new Map(ownBookings.map((b) => [b.id, b]));

    type ExternalRow = {
      external_source: 'airbnb_ical' | 'booking_ical';
      external_ref: string;
      checkin_date: string | null;
      stay_checkout_date: string | null;
      guest_name: string | null;
      num_guests: number | null;
      created_at: string;
      linked_to_booking_id: string | null;
      linked_to_external_source: 'airbnb_ical' | 'booking_ical' | null;
      linked_to_external_ref: string | null;
    };
    const externalRows = ((external || []) as ExternalRow[]).filter(
      (t) => t.checkin_date && t.stay_checkout_date
    );
    const externalByKey = new Map(
      externalRows.map((r) => [`${r.external_source}|${r.external_ref}`, r])
    );

    function rawDisplayName(t: ExternalRow): string {
      const rawName = (t.guest_name || '').trim();
      const isPlaceholder =
        !rawName ||
        /not available/i.test(rawName) ||
        /^closed/i.test(rawName);
      if (!isPlaceholder) return rawName;
      return t.external_source === 'booking_ical'
        ? 'Booking.com (sem nome)'
        : 'Airbnb';
    }

    function resolveDisplayName(t: ExternalRow, depth = 0): string {
      if (depth > 5) return rawDisplayName(t);
      if (t.linked_to_booking_id) {
        const parent = ownById.get(t.linked_to_booking_id);
        if (parent) return parent.guest_name;
      }
      if (t.linked_to_external_source && t.linked_to_external_ref) {
        const parent = externalByKey.get(
          `${t.linked_to_external_source}|${t.linked_to_external_ref}`
        );
        if (parent) return resolveDisplayName(parent, depth + 1);
      }
      return rawDisplayName(t);
    }

    // Index children by their parent so a "head" row can absorb its
    // descendants' ranges. Children themselves are hidden from the list.
    const childrenByParent = new Map<string, ExternalRow[]>();
    for (const r of externalRows) {
      if (r.linked_to_external_source && r.linked_to_external_ref) {
        const key = `${r.linked_to_external_source}|${r.linked_to_external_ref}`;
        const arr = childrenByParent.get(key) || [];
        arr.push(r);
        childrenByParent.set(key, arr);
      }
    }

    function descendants(t: ExternalRow, seen = new Set<string>()): ExternalRow[] {
      const key = `${t.external_source}|${t.external_ref}`;
      if (seen.has(key)) return [];
      seen.add(key);
      const direct = childrenByParent.get(key) || [];
      const out: ExternalRow[] = [];
      for (const c of direct) {
        out.push(c);
        out.push(...descendants(c, seen));
      }
      return out;
    }

    const externalBookings: Booking[] = externalRows
      .filter(
        (t) =>
          // Hide rows that are children of something — their range is
          // absorbed by the head (external head) or by the website
          // booking parent.
          !t.linked_to_booking_id &&
          !(t.linked_to_external_source && t.linked_to_external_ref)
      )
      .map((t) => {
        const group = [t, ...descendants(t)];
        const minCi = group.reduce(
          (acc, r) => (r.checkin_date! < acc ? r.checkin_date! : acc),
          t.checkin_date!
        );
        const maxCo = group.reduce(
          (acc, r) => (r.stay_checkout_date! > acc ? r.stay_checkout_date! : acc),
          t.stay_checkout_date!
        );
      const ci = new Date(minCi + 'T00:00:00Z');
      const co = new Date(maxCo + 'T00:00:00Z');
      const nights = Math.max(
        1,
        Math.round((co.getTime() - ci.getTime()) / 86400000)
      );
      const sourceLabel = t.external_source === 'airbnb_ical' ? 'airbnb' : 'booking';
      const refPrefix = t.external_source === 'airbnb_ical' ? 'AIR' : 'BKG';
      return {
        id: `ext:${t.external_source}:${t.external_ref}`,
        guest_name: resolveDisplayName(t),
        guest_email: '',
        guest_phone: null,
        checkin_date: minCi,
        checkout_date: maxCo,
        num_guests: t.num_guests ?? 0,
        message: null,
        num_nights: nights,
        price_per_night: null,
        cleaning_fee: null,
        total_price: 0,
        status: 'confirmed',
        payment_status: 'paid',
        source: sourceLabel,
        created_at: t.created_at,
        reference: `${refPrefix}-${t.external_ref.slice(-8).toUpperCase()}`,
        _external: true,
        _externalSource: t.external_source,
        _externalRef: t.external_ref,
        _linkedToBookingId: t.linked_to_booking_id,
        _linkedToExternalSource: t.linked_to_external_source,
        _linkedToExternalRef: t.linked_to_external_ref,
        _childCount: group.length - 1,
      } as Booking & {
        reference: string;
        _external: true;
        _externalSource: 'airbnb_ical' | 'booking_ical';
        _externalRef: string;
        _linkedToBookingId: string | null;
        _linkedToExternalSource: 'airbnb_ical' | 'booking_ical' | null;
        _linkedToExternalRef: string | null;
        _childCount: number;
      };
    });

    const merged: Booking[] = [...ownBookings, ...externalBookings];

    merged.sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));

    setBookings(merged);
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

    const { data: tasks } = await supabase
      .from('cleaning_tasks')
      .select('checkin_date, stay_checkout_date, external_source, booking_id, guest_name');
    const ci = new Set<string>();
    const co = new Set<string>();
    const sourceByDate: Record<string, string> = {};
    const guestByDate: Record<string, string> = {};
    for (const t of (tasks || []) as Array<{
      checkin_date: string | null;
      stay_checkout_date: string | null;
      external_source: string | null;
      booking_id: string | null;
      guest_name: string | null;
    }>) {
      const src = t.external_source || (t.booking_id ? 'website' : 'manual');
      if (t.checkin_date) {
        ci.add(t.checkin_date);
        if (!sourceByDate[t.checkin_date]) sourceByDate[t.checkin_date] = src;
      }
      if (t.stay_checkout_date) {
        co.add(t.stay_checkout_date);
        if (!sourceByDate[t.stay_checkout_date]) sourceByDate[t.stay_checkout_date] = src;
      }
      // Spread guest_name across the whole stay so midstay days show it too.
      if (t.guest_name && t.checkin_date && t.stay_checkout_date) {
        const cur = new Date(t.checkin_date + 'T00:00:00Z');
        const end = new Date(t.stay_checkout_date + 'T00:00:00Z');
        while (cur <= end) {
          const iso = cur.toISOString().slice(0, 10);
          if (!guestByDate[iso]) guestByDate[iso] = t.guest_name;
          cur.setUTCDate(cur.getUTCDate() + 1);
        }
      } else if (t.guest_name && t.checkin_date) {
        if (!guestByDate[t.checkin_date]) guestByDate[t.checkin_date] = t.guest_name;
      }
    }
    setCheckinDays(ci);
    setCheckoutDays(co);
    setSourceByDate(sourceByDate);
    setGuestByDate(guestByDate);
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

  const today = new Date().toISOString().slice(0, 10);
  const filteredBookings = (() => {
    if (filter === 'past') return bookings.filter((b) => b.checkout_date < today);
    const upcoming = bookings.filter((b) => b.checkout_date >= today);
    if (filter === 'all') return upcoming;
    return upcoming.filter((b) => b.status === filter);
  })();

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

      {detailBooking && (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
        />
      )}

      {deleteTarget && (
        <DeleteBookingModal
          booking={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async (confirmation) => {
            const ok = await handleDelete(deleteTarget, confirmation);
            if (ok) setDeleteTarget(null);
          }}
        />
      )}

      {linkTarget && (
        <LinkExternalModal
          external={linkTarget}
          candidates={bookings.filter((b) => {
            if (b.id === linkTarget.id) return false;
            if (b.status === 'cancelled') return false;
            const m = b as Booking & ExternalMeta;
            if (m._external && (m._linkedToBookingId || m._linkedToExternalRef)) {
              return false;
            }
            return true;
          })}
          onCancel={() => setLinkTarget(null)}
          onConfirm={(parent, siblings) => linkExternal(linkTarget, parent, siblings)}
        />
      )}

      {showManualModal && (
        <ManualBookingModal
          preset={preset}
          blocked={blockedDates}
          checkinDays={checkinDays}
          checkoutDays={checkoutDays}
          sourceByDate={sourceByDate}
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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowManualModal(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors text-sm font-medium"
          >
            <Plus size={14} /> Reserva manual
          </button>
          <Filter size={16} className="text-gray-400" />
          {(['all', 'pending', 'confirmed', 'cancelled', 'past'] as const).map((f) => {
            const labels: Record<string, string> = { all: 'Activas', pending: 'Pendente', confirmed: 'Confirmada', cancelled: 'Cancelada', past: 'Histórico' };
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
        checkinDays={checkinDays}
        checkoutDays={checkoutDays}
        sourceByDate={sourceByDate}
        guestByDate={guestByDate}
        bookingByDate={bookingByDate}
        onOpenBooking={(b) => setDetailBooking(b)}
        onPickRange={(checkin, checkout) => {
          setPreset({ checkin_date: checkin, checkout_date: checkout });
          setShowManualModal(true);
        }}
      />

      {/* Mobile booking cards */}
      <div className="sm:hidden space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6 text-center text-gray-500 text-sm">
            Nenhuma reserva encontrada
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const ref = (booking as Booking & { reference?: string }).reference || '-';
            const meta = booking as Booking & ExternalMeta;
            const isExternal = meta._external === true;
            const isLinked = isExternal && (!!meta._linkedToBookingId || !!meta._linkedToExternalRef || (meta._childCount ?? 0) > 0);
            return (
              <div
                key={booking.id}
                className={`border rounded-2xl p-4 space-y-2 ${
                  isLinked
                    ? 'bg-purple-900/20 border-purple-500/30'
                    : 'bg-[#16213e] border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {booking.guest_name || 'Sem nome'}
                    </p>
                    {booking.guest_phone && (
                      <p className="text-xs text-gray-500">{booking.guest_phone}</p>
                    )}
                    {booking.guest_email && (
                      <p className="text-xs text-gray-500 truncate">{booking.guest_email}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-blue-400 whitespace-nowrap">
                    {ref}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">
                    {booking.checkin_date} → {booking.checkout_date}
                  </span>
                  <span className="text-gray-500">
                    {booking.num_nights}n · {booking.num_guests}p
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">
                    {isExternal ? '—' : `${booking.total_price}€`}
                  </span>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={booking.status} />
                    {!isExternal && <StatusBadge status={booking.payment_status} />}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[11px] text-gray-500">{booking.source || 'website'}</span>
                  <div className="flex items-center gap-1">
                    {!isExternal && (
                      <button
                        onClick={() => setDetailBooking(booking)}
                        className="p-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10"
                        title="Ver detalhes e notas"
                      >
                        <StickyNote size={14} />
                      </button>
                    )}
                    {!isExternal && booking.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(booking.id, 'confirmed')}
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          title="Confirmar"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => updateStatus(booking.id, 'cancelled')}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                          title="Cancelar"
                        >
                          <XCircle size={16} />
                        </button>
                      </>
                    )}
                    {!isExternal && booking.status === 'confirmed' && (
                      <button
                        onClick={() => updateStatus(booking.id, 'cancelled')}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        title="Cancelar"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                    {!isExternal && booking.payment_status === 'paid' && (
                      <button
                        onClick={() => setRefundTarget(booking)}
                        disabled={refunding === booking.id}
                        className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 text-xs font-medium disabled:opacity-50"
                      >
                        {refunding === booking.id ? '...' : 'Refund'}
                      </button>
                    )}
                    {!isExternal && booking.payment_status === 'refunded' && (
                      <span className="text-[11px] text-gray-500">reembolsado</span>
                    )}
                    {!isExternal && (
                      <button
                        onClick={() => setDeleteTarget(booking)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        title="Apagar reserva"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isExternal && (
                      <button
                        onClick={() => {
                          if (isLinked) {
                            const childCount = meta._childCount ?? 0;
                            const msg = childCount > 0
                              ? `Desligar este agrupamento? As ${childCount} entrada${childCount > 1 ? 's' : ''} agrupada${childCount > 1 ? 's' : ''} voltam a aparecer separadas.`
                              : 'Remover esta ligação?';
                            if (!confirm(msg)) return;
                            linkExternal(booking, null);
                          } else {
                            setLinkTarget(booking);
                          }
                        }}
                        className={`p-1.5 rounded-lg ${
                          isLinked
                            ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                        }`}
                        title={isLinked ? 'Desligar' : 'Ligar a reserva website'}
                      >
                        {isLinked ? <Unlink size={14} /> : <LinkIcon size={14} />}
                      </button>
                    )}
                    {isExternal && (
                      <span className="text-[10px] uppercase tracking-wider text-gray-500">
                        {isLinked ? 'ligada' : `gerir em ${booking.source}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
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
                filteredBookings.map((booking, i) => {
                  const meta = booking as Booking & ExternalMeta;
                  const isExternal = meta._external === true;
                  const isLinked = isExternal && (!!meta._linkedToBookingId || !!meta._linkedToExternalRef || (meta._childCount ?? 0) > 0);
                  return (
                  <tr
                    key={booking.id}
                    className={`hover:bg-white/[0.02] ${
                      isLinked
                        ? 'bg-purple-900/20'
                        : i % 2 === 1
                          ? 'bg-white/[0.01]'
                          : ''
                    }`}
                  >
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
                    <td className="px-6 py-4 text-sm text-white font-medium">{isExternal ? '—' : `${booking.total_price}EUR`}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="px-6 py-4">
                      {isExternal ? <span className="text-xs text-gray-500">—</span> : <StatusBadge status={booking.payment_status} />}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{booking.source}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {isExternal ? (
                          <>
                            <button
                              onClick={() =>
                                isLinked
                                  ? linkExternal(booking, null)
                                  : setLinkTarget(booking)
                              }
                              className={`p-1.5 rounded-lg ${
                                isLinked
                                  ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
                              }`}
                              title={isLinked ? 'Desligar' : 'Ligar a reserva website'}
                            >
                              {isLinked ? <Unlink size={16} /> : <LinkIcon size={16} />}
                            </button>
                            <span className="text-[11px] uppercase tracking-wider text-gray-500">
                              {isLinked ? 'ligada' : `gerir em ${booking.source}`}
                            </span>
                          </>
                        ) : (
                          <>
                        <button
                          onClick={() => setDetailBooking(booking)}
                          className="p-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10"
                          title="Ver detalhes e notas"
                        >
                          <StickyNote size={16} />
                        </button>
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
                        <button
                          onClick={() => setDeleteTarget(booking)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                          title="Apagar reserva (permanente)"
                        >
                          <Trash2 size={16} />
                        </button>
                          </>
                        )}
                      </div>
                    </td>
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

function DeleteBookingModal({
  booking,
  onCancel,
  onConfirm,
}: {
  booking: Booking;
  onCancel: () => void;
  onConfirm: (confirmation: string) => Promise<void> | void;
}) {
  const reference = (booking as Booking & { reference?: string }).reference || '';
  const expected = reference || 'APAGAR';
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const matches = input.trim().toUpperCase() === expected.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#16213e] border border-red-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-2">Apagar reserva permanentemente</h2>
        <p className="text-sm text-gray-400 mb-4">
          Esta acção remove a reserva de <span className="text-white font-medium">{booking.guest_name}</span>
          {' '}({booking.checkin_date} → {booking.checkout_date}), as tarefas de limpeza associadas e desbloqueia
          os dias correspondentes. <span className="text-red-400">Não é possível recuperar.</span>
        </p>
        <label className="block">
          <span className="block text-xs text-gray-400 mb-1.5">
            Para confirmar, escreve <span className="font-mono text-red-300">{expected}</span>:
          </span>
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
            placeholder={expected}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-mono focus:outline-none focus:border-red-500/50"
          />
        </label>
        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(input.trim());
              } finally {
                setBusy(false);
              }
            }}
            disabled={!matches || busy}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'A apagar…' : 'Apagar definitivamente'}
          </button>
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

function DoorCodeEditor({ booking, onSaved }: { booking: Booking; onSaved: () => void }) {
  const current = (booking as Booking & { door_code?: string | null }).door_code || '';
  const [code, setCode] = useState(current);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('bookings').update({ door_code: code.trim() || null }).eq('id', booking.id);
    setSaving(false);
    if (error) {
      setMsg('Erro: ' + error.message);
      return;
    }
    setMsg('Guardado');
    setTimeout(() => setMsg(null), 1500);
    onSaved();
  }

  const missing = !code.trim();
  return (
    <div className={`rounded-xl border px-3 py-3 ${missing ? 'bg-amber-500/5 border-amber-500/30' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">Código da fechadura</span>
        {missing && <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded">por definir</span>}
        {msg && <span className="text-xs text-green-400 ml-auto">{msg}</span>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ex: 4729"
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white"
        />
        <button
          onClick={save}
          disabled={saving || code === current}
          className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-40"
        >
          {saving ? '…' : 'Guardar'}
        </button>
      </div>
      <p className="text-[10px] text-gray-500 mt-1.5">
        Único para esta reserva. O email pre-arrival só é enviado quando este campo está preenchido.
      </p>
    </div>
  );
}

function BookingDetailModal({
  booking,
  onClose,
}: {
  booking: Booking;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(booking.message || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const dirty = notes.trim() !== (booking.message || '').trim();

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from('bookings')
      .update({ message: notes.trim() || null })
      .eq('id', booking.id);
    setSaving(false);
    if (error) {
      setMsg('Erro ao guardar: ' + error.message);
      return;
    }
    setMsg('Guardado');
    setTimeout(() => setMsg(null), 1500);
  }

  function appendStamp(text: string) {
    const now = new Date();
    const stamp = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const newLine = `${stamp} — ${text}`;
    setNotes((prev) => (prev ? prev.trimEnd() + '\n' + newLine : newLine));
  }

  const ref = (booking as Booking & { reference?: string }).reference || booking.id.slice(0, 8).toUpperCase();

  // Parse the most recent "Sinal pago: X€" / "pagou X€" lines out of the
  // notes blob so we can show a proper paid/owed summary. We sum all of
  // them because the admin keeps appending new payment lines.
  const paidFromNotes = (() => {
    let sum = 0;
    const text = notes || '';
    const re = /(?:sinal pago|pagou|paguei|recebido)[^\d]*([\d.,]+)\s*(?:€|eur)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(n)) sum += n;
    }
    return sum;
  })();
  const owed = Math.max(0, (booking.total_price || 0) - paidFromNotes);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#16213e] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Detalhes da reserva</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XIcon size={18} />
          </button>
        </div>

        <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Ref.</span>
            <span className="font-mono text-blue-300">{ref}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Hóspede</span>
            <span className="text-white font-medium">{booking.guest_name}</span>
          </div>
          {booking.guest_phone && (
            <div className="flex justify-between">
              <span className="text-gray-400">Telefone</span>
              <a
                href={`tel:${booking.guest_phone}`}
                className="text-white hover:text-blue-300"
              >
                {booking.guest_phone}
              </a>
            </div>
          )}
          {booking.guest_email && (
            <div className="flex justify-between">
              <span className="text-gray-400">Email</span>
              <span className="text-white truncate ml-2">{booking.guest_email}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Datas</span>
            <span className="text-white">
              {booking.checkin_date} → {booking.checkout_date}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Noites · hóspedes</span>
            <span className="text-white">
              {booking.num_nights} · {booking.num_guests}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total</span>
            <span className="text-white font-semibold">{booking.total_price}€</span>
          </div>
          {paidFromNotes > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Pago</span>
                <span className="text-green-300 font-medium">{paidFromNotes}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Falta pagar</span>
                <span className={`font-semibold ${owed > 0 ? 'text-amber-300' : 'text-green-300'}`}>{owed}€</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Estado</span>
            <span className="text-white">
              {booking.status} · {booking.payment_status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Origem</span>
            <span className="text-gray-300">{booking.source || '—'}</span>
          </div>
          {(booking as Booking & { guide_token?: string | null }).guide_token && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-gray-400">Guia do hóspede</span>
              <button
                onClick={async () => {
                  const bAny = booking as Booking & { guide_token?: string; language?: string };
                  const tok = bAny.guide_token;
                  const lang = bAny.language && ['pt', 'en', 'es', 'de'].includes(bAny.language) ? bAny.language : 'pt';
                  const url = `${window.location.origin}/${lang}/guia/${tok}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setMsg('Link do guia copiado');
                    setTimeout(() => setMsg(null), 1500);
                  } catch {
                    prompt('Copia o link:', url);
                  }
                }}
                className="text-xs text-blue-300 hover:text-blue-200 underline"
              >
                copiar link
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <DoorCodeEditor booking={booking} onSaved={() => { /* noop, admin closes modal */ }} />
        </div>

        <label className="block mb-2">
          <span className="block text-xs text-gray-400 mb-1">Notas / histórico de pagamentos</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
            rows={8}
            placeholder="ex: 15/05/2026 — pagou mais 500€, falta 1900€ em mãos à chegada"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/50 font-mono whitespace-pre-wrap"
          />
        </label>

        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-xs text-gray-500">Adicionar entrada rápida:</span>
          <button
            onClick={() => {
              const amount = prompt('Valor pago agora (€)');
              if (amount) appendStamp(`pagou ${amount}€`);
            }}
            className="px-2 py-1 rounded bg-white/5 hover:bg-green-500/20 text-gray-300 text-xs"
          >
            + pagamento
          </button>
          <button
            onClick={() => {
              const what = prompt('Nota');
              if (what) appendStamp(what);
            }}
            className="px-2 py-1 rounded bg-white/5 hover:bg-blue-500/20 text-gray-300 text-xs"
          >
            + nota
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          {msg && <span className="text-xs text-green-400">{msg}</span>}
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium disabled:opacity-50"
            >
              Fechar
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'A guardar...' : 'Guardar notas'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniRangeCalendar({
  blocked,
  checkinDays,
  checkoutDays,
  sourceByDate,
  start,
  end,
  onPick,
}: {
  blocked: BlockedDateRow[];
  checkinDays: Set<string>;
  checkoutDays: Set<string>;
  sourceByDate: Record<string, string>;
  start: string;
  end: string;
  onPick: (start: string, end: string) => void;
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }, []);
  const initial = start || new Date().toISOString().slice(0, 10);
  const [cursor, setCursor] = useState(
    () => new Date(Date.UTC(parseInt(initial.slice(0, 4)), parseInt(initial.slice(5, 7)) - 1, 1))
  );

  const year = cursor.getUTCFullYear();
  const month = cursor.getUTCMonth();
  const label = cursor.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const blockedMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of blocked) m.set(b.date, b.source);
    return m;
  }, [blocked]);

  const cells = useMemo(() => {
    const first = new Date(Date.UTC(year, month, 1));
    const weekday = (first.getUTCDay() + 6) % 7;
    const gridStart = new Date(first);
    gridStart.setUTCDate(gridStart.getUTCDate() - weekday);
    const out: { iso: string; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setUTCDate(d.getUTCDate() + i);
      out.push({ iso: d.toISOString().slice(0, 10), inMonth: d.getUTCMonth() === month });
    }
    return out;
  }, [year, month]);

  function colorOf(src: string | undefined): string {
    switch (src) {
      case 'airbnb_ical':
        return 'rgba(236,72,153,0.85)';
      case 'booking_ical':
        return 'rgba(59,130,246,0.85)';
      case 'website':
      case 'manual':
        return 'rgba(16,185,129,0.85)';
      default:
        return 'rgba(156,163,175,0.85)';
    }
  }

  function onClick(iso: string, canPick: boolean) {
    if (!canPick) return;
    if (!start || (start && end)) {
      onPick(iso, '');
    } else if (iso <= start) {
      onPick(iso, '');
    } else {
      onPick(start, iso);
    }
  }

  function inSelection(iso: string) {
    if (!start) return false;
    const e = end || start;
    return iso >= start && iso <= e;
  }

  const todayIso = today.toISOString().slice(0, 10);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-300 capitalize">{label}</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor(new Date(Date.UTC(year, month - 1, 1)))}
            className="p-1 rounded hover:bg-white/10 text-gray-300"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCursor(new Date(Date.UTC(year, month + 1, 1)))}
            className="p-1 rounded hover:bg-white/10 text-gray-300"
            aria-label="Mês seguinte"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-[9px] uppercase tracking-wider text-gray-500 mb-0.5">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
          <div key={i} className="text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map(({ iso, inMonth }) => {
          const src = sourceByDate[iso] || blockedMap.get(iso);
          const isBlocked = blockedMap.has(iso);
          const isCheckin = checkinDays.has(iso);
          const isCheckout = checkoutDays.has(iso);
          const isTurn = isCheckin && isCheckout;
          const fullyBooked = isBlocked && !isTurn && !(isCheckin && !isCheckout) && !(isCheckout && !isCheckin);
          const canPick = inMonth && !fullyBooked;

          const color = colorOf(src);
          const diag = 'rgba(255,255,255,0.35)';
          let bgStyle: React.CSSProperties | undefined;
          if (isTurn) {
            const ci = colorOf(sourceByDate[iso]);
            bgStyle = {
              background: `linear-gradient(135deg, ${color} 0%, ${color} 48%, ${diag} 48%, ${diag} 52%, ${ci} 52%, ${ci} 100%)`,
            };
          } else if (isCheckout && !isCheckin) {
            bgStyle = {
              background: `linear-gradient(135deg, ${color} 0%, ${color} 48%, ${diag} 48%, ${diag} 52%, transparent 52%)`,
            };
          } else if (isCheckin && !isCheckout) {
            bgStyle = {
              background: `linear-gradient(135deg, transparent 0%, transparent 48%, ${diag} 48%, ${diag} 52%, ${color} 52%)`,
            };
          } else if (fullyBooked) {
            bgStyle = { background: color };
          }

          const inSel = inSelection(iso);
          const isToday = iso === todayIso;

          return (
            <button
              type="button"
              key={iso}
              onClick={() => onClick(iso, canPick)}
              disabled={!canPick}
              style={bgStyle}
              className={`relative h-7 sm:h-8 rounded text-[10px] border flex items-center justify-center
                ${inMonth ? '' : 'opacity-30'}
                ${fullyBooked ? 'border-white/10 cursor-not-allowed text-white/90' : 'border-white/10 text-gray-200'}
                ${canPick ? 'hover:ring-1 hover:ring-emerald-300/60' : ''}
                ${inSel && canPick ? '!border-emerald-300/80 !bg-emerald-500/30 !text-white' : ''}
                ${isToday ? 'outline outline-1 outline-amber-400/60' : ''}
                ${isTurn ? 'ring-1 ring-red-400/70' : ''}`}
            >
              <span className="font-medium leading-none">{parseInt(iso.slice(8, 10), 10)}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[10px] text-gray-500 mt-2">
        Clica em 2 dias livres para definir entrada/saída. Dias ocupados não são seleccionáveis.
      </p>
    </div>
  );
}

function AvailabilityCalendar({
  blocked,
  checkinDays,
  checkoutDays,
  sourceByDate,
  guestByDate,
  bookingByDate,
  onOpenBooking,
  onPickRange,
}: {
  blocked: BlockedDateRow[];
  checkinDays: Set<string>;
  checkoutDays: Set<string>;
  sourceByDate: Record<string, string>;
  guestByDate: Record<string, string>;
  bookingByDate: Record<string, Booking>;
  onOpenBooking: (booking: Booking) => void;
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

  const cells: { iso: string; inMonth: boolean }[] = useMemo(() => {
    const firstOfMonth = new Date(Date.UTC(year, month, 1));
    const weekday = (firstOfMonth.getUTCDay() + 6) % 7;
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

  // Solid colors per source, used for diagonal gradients.
  function colorOf(src: string | undefined): string {
    switch (src) {
      case 'airbnb_ical':
        return 'rgba(236,72,153,0.85)'; // pink-500
      case 'booking_ical':
        return 'rgba(59,130,246,0.85)'; // blue-500
      case 'website':
      case 'manual':
        return 'rgba(16,185,129,0.85)'; // emerald-500
      default:
        return 'rgba(156,163,175,0.85)'; // gray-400
    }
  }

  function initialOf(src: string | undefined): string {
    switch (src) {
      case 'airbnb_ical':
        return 'A';
      case 'booking_ical':
        return 'B';
      case 'website':
      case 'manual':
        return 'S';
      default:
        return '·';
    }
  }

  function onDayClick(iso: string, canSelect: boolean) {
    if (!canSelect) return;
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

  const todayIso = today.toISOString().slice(0, 10);

  return (
    <div className="bg-[#16213e] rounded-2xl border border-white/5 p-3 sm:p-5">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Disponibilidade
        </h2>
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
      <p className="text-lg sm:text-xl font-semibold text-white capitalize mb-3">{monthLabel}</p>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] uppercase tracking-wider text-gray-500 mb-1">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d) => (
          <div key={d} className="text-center">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {cells.map(({ iso, inMonth }) => {
          const b = blockedMap.get(iso);
          const isBlocked = !!b;
          const isCheckin = checkinDays.has(iso);
          const isCheckout = checkoutDays.has(iso);
          const isTurn = isCheckin && isCheckout;
          const isToday = iso === todayIso;
          const inSel = inSelection(iso);

          // A checkout-only day (morning busy, afternoon free) is still
          // pickable as a check-in for a new booking, same for the
          // mirror case. Fully blocked mid-stay days can't be picked.
          const fullyBooked = isBlocked && !isTurn && !(isCheckin && !isCheckout) && !(isCheckout && !isCheckin);
          const canSelect = inMonth && !fullyBooked;

          const color = colorOf(sourceByDate[iso] || b?.source);

          // Diagonal painting with a visible white line separating the halves.
          //   checkout-only → top-left triangle colored (morning busy)
          //   checkin-only  → bottom-right triangle colored (afternoon busy)
          //   turn          → diagonal split bicolor
          //   mid-stay      → solid color
          const diagLine = 'rgba(255,255,255,0.35)';
          let bgStyle: React.CSSProperties | undefined;
          if (isTurn) {
            const ci = colorOf(sourceByDate[iso]);
            bgStyle = {
              background: `linear-gradient(135deg, ${color} 0%, ${color} 48%, ${diagLine} 48%, ${diagLine} 52%, ${ci} 52%, ${ci} 100%)`,
            };
          } else if (isCheckout && !isCheckin) {
            bgStyle = {
              background: `linear-gradient(135deg, ${color} 0%, ${color} 48%, ${diagLine} 48%, ${diagLine} 52%, transparent 52%, transparent 100%)`,
            };
          } else if (isCheckin && !isCheckout) {
            bgStyle = {
              background: `linear-gradient(135deg, transparent 0%, transparent 48%, ${diagLine} 48%, ${diagLine} 52%, ${color} 52%, ${color} 100%)`,
            };
          } else if (fullyBooked) {
            bgStyle = { background: color };
          }

          const src = sourceByDate[iso] || b?.source;
          const initial = initialOf(src);
          const guest = guestByDate[iso];
          const firstName = guest ? guest.replace(/\s*\(.*$/, '').split(' ')[0] : '';
          const showName = !!guest && (isCheckin || fullyBooked) && firstName.length > 0;

          const titleParts: string[] = [iso];
          if (guest) titleParts.push(guest);
          if (isCheckin) titleParts.push('entrada');
          if (isCheckout) titleParts.push('saída');
          if (isTurn) titleParts.push('mudança no mesmo dia');
          if (src) titleParts.push(src);
          if (b?.note) titleParts.push(b.note);

          const dayBooking = bookingByDate[iso];
          const isPast = iso < todayIso;

          return (
            <button
              key={iso}
              onClick={() => onDayClick(iso, canSelect)}
              onDoubleClick={(e) => {
                if (dayBooking) {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenBooking(dayBooking);
                }
              }}
              disabled={!canSelect && !dayBooking}
              title={dayBooking ? titleParts.join(' · ') + ' · duplo-clique: abrir notas' : titleParts.join(' · ')}
              style={bgStyle}
              className={`relative h-11 sm:h-16 rounded-md sm:rounded-lg text-[11px] sm:text-xs border transition-colors flex items-start justify-between p-1
                ${inMonth ? '' : 'opacity-30'}
                ${isPast && inMonth ? 'opacity-40 grayscale' : ''}
                ${fullyBooked ? (dayBooking ? 'border-white/10 cursor-pointer text-white' : 'border-white/10 cursor-not-allowed text-white') : 'border-white/10 text-gray-200'}
                ${canSelect ? 'hover:ring-1 hover:ring-emerald-300/60' : ''}
                ${inSel && canSelect ? '!border-emerald-300/60 ring-1 ring-emerald-300/60' : ''}
                ${isToday ? 'outline outline-2 outline-amber-400 ring-2 ring-amber-400/40' : ''}
                ${isTurn ? 'ring-1 ring-red-400/70' : ''}`}
            >
              <span className="font-semibold leading-none">{parseInt(iso.slice(8, 10), 10)}</span>
              {/* Guest first-name — hidden on tiny screens */}
              {showName && (
                <span
                  className="hidden sm:block absolute bottom-1 left-1 right-1 text-[10px] font-medium text-white/95 leading-tight truncate"
                  title={guest}
                >
                  {firstName}
                </span>
              )}
              {/* Source letter in the colored corner */}
              {isCheckout && !isCheckin && (
                <span className="absolute top-0.5 left-1 text-[9px] sm:text-[10px] font-bold text-white/90 leading-none">
                  {initial}
                </span>
              )}
              {isCheckin && !isCheckout && !showName && (
                <span className="absolute bottom-0.5 right-1 text-[9px] sm:text-[10px] font-bold text-white/90 leading-none">
                  {initial}
                </span>
              )}
              {fullyBooked && !showName && (
                <span className="absolute bottom-0.5 right-1 text-[9px] sm:text-[10px] font-bold text-white/90 leading-none">
                  {initial}
                </span>
              )}
              {isTurn && (
                <span className="absolute top-0.5 right-1 text-[8px] font-bold text-white bg-red-600 rounded px-1 leading-tight">
                  TURN
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-gray-400 flex-wrap">
          <Legend color="bg-white/5 border-white/10" label="livre" />
          <Legend color="bg-emerald-500/85 border-emerald-400/40" label="S·site/manual" />
          <Legend color="bg-pink-500/85 border-pink-400/40" label="A·Airbnb" />
          <Legend color="bg-blue-500/85 border-blue-400/40" label="B·Booking" />
          <span className="inline-flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded border border-red-400/70"
              style={{
                background:
                  'linear-gradient(135deg, rgba(59,130,246,0.85) 48%, rgba(255,255,255,0.35) 48%, rgba(255,255,255,0.35) 52%, rgba(236,72,153,0.85) 52%)',
              }}
            />
            mudança
          </span>
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
  blocked,
  checkinDays,
  checkoutDays,
  sourceByDate,
  onCancel,
  onCreated,
  onError,
}: {
  preset?: { checkin_date?: string; checkout_date?: string };
  blocked: BlockedDateRow[];
  checkinDays: Set<string>;
  checkoutDays: Set<string>;
  sourceByDate: Record<string, string>;
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
  const [depositDate, setDepositDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [language, setLanguage] = useState<'pt' | 'en' | 'es' | 'de'>('pt');
  const [country, setCountry] = useState<string>('');
  const [languageTouched, setLanguageTouched] = useState(false);
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
          deposit_date: depositDate,
          language,
          country: country || null,
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
              onChange={(e) => {
                setCheckin(e.target.value);
                if (checkout && e.target.value >= checkout) setCheckout('');
              }}
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
          <div className="sm:col-span-2">
            <MiniRangeCalendar
              blocked={blocked}
              checkinDays={checkinDays}
              checkoutDays={checkoutDays}
              sourceByDate={sourceByDate}
              start={checkin}
              end={checkout}
              onPick={(s, e) => {
                setCheckin(s);
                setCheckout(e);
              }}
            />
          </div>
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
          <Field label="Data do sinal">
            <input
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              disabled={deposit <= 0}
              className={fieldCls + ' disabled:opacity-40'}
            />
          </Field>
          <Field label="País de origem">
            <select
              value={country}
              onChange={(e) => {
                const code = e.target.value;
                setCountry(code);
                if (!languageTouched && code) {
                  setLanguage(countryToLanguage(code));
                }
              }}
              className={fieldCls}
            >
              <option value="">—</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.name_pt}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Idioma do email">
            <select
              value={language}
              onChange={(e) => {
                setLanguageTouched(true);
                setLanguage(e.target.value as 'pt' | 'en' | 'es' | 'de');
              }}
              className={fieldCls}
            >
              <option value="pt">Português</option>
              <option value="en">English</option>
              <option value="es">Español</option>
              <option value="de">Deutsch</option>
            </select>
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

function LinkExternalModal({
  external,
  candidates,
  onCancel,
  onConfirm,
}: {
  external: Booking;
  candidates: Booking[];
  onCancel: () => void;
  onConfirm: (parent: Booking | null, siblings: Booking[]) => void | Promise<void>;
}) {
  type ExternalMetaLite = { _external?: boolean };
  const [websiteParent, setWebsiteParent] = useState<Booking | null>(null);
  const [siblingIds, setSiblingIds] = useState<Set<string>>(new Set());

  const overlap = (a: Booking, b: Booking) =>
    a.checkin_date < b.checkout_date && a.checkout_date > b.checkin_date;

  const externalSiblings = candidates
    .filter((b) => (b as Booking & ExternalMetaLite)._external)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const websiteCandidates = candidates
    .filter((b) => !(b as Booking & ExternalMetaLite)._external)
    .sort((a, b) => {
      const ao = overlap(external, a) ? 0 : 1;
      const bo = overlap(external, b) ? 0 : 1;
      if (ao !== bo) return ao - bo;
      return a.checkin_date.localeCompare(b.checkin_date);
    });

  const toggleSibling = (id: string) => {
    setSiblingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalCount = 1 + siblingIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#16213e] border border-purple-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-white mb-1">Agrupar reservas</h2>
        <p className="text-xs text-gray-400 mb-4">
          Esta estadia ({external.checkin_date} → {external.checkout_date} · {external.source})
          {websiteParent
            ? <> será ligada à reserva <span className="text-purple-300">{websiteParent.guest_name}</span>.</>
            : ' fica como cabeça do grupo. A limpeza fica neste check-in.'}
          {siblingIds.size > 0 && (
            <> Vão também ser agrupadas mais {siblingIds.size} entrada{siblingIds.size > 1 ? 's' : ''} externa{siblingIds.size > 1 ? 's' : ''}.</>
          )}
        </p>

        {externalSiblings.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
              Outras entradas externas a juntar
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
              {externalSiblings.map((b) => {
                const checked = siblingIds.has(b.id);
                return (
                  <label
                    key={b.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'bg-purple-500/15 border-purple-500/40'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSibling(b.id)}
                      className="accent-purple-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white truncate">{b.guest_name}</div>
                      <div className="text-xs text-gray-400">
                        {b.checkin_date} → {b.checkout_date} · {b.num_nights}n · {b.source}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </>
        )}

        {websiteCandidates.length > 0 && (
          <>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">
              Ou ligar a uma reserva website existente
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1 mb-5">
              <button
                onClick={() => setWebsiteParent(null)}
                className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                  websiteParent === null
                    ? 'bg-purple-500/15 border-purple-500/40'
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                }`}
              >
                <div className="text-sm text-white">Sem reserva website (esta entrada é a cabeça)</div>
                <div className="text-xs text-gray-400">
                  {external.checkin_date} → {external.checkout_date} · {external.num_nights}n · {external.source}
                </div>
              </button>
              {websiteCandidates.map((b) => {
                const isOverlap = overlap(external, b);
                return (
                  <button
                    key={b.id}
                    onClick={() => setWebsiteParent(b)}
                    className={`w-full text-left px-3 py-2 rounded-lg border transition-colors ${
                      websiteParent?.id === b.id
                        ? 'bg-purple-500/20 border-purple-500/50'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white truncate">{b.guest_name}</span>
                      {isOverlap && (
                        <span className="text-[10px] uppercase tracking-wider text-purple-300">sobrepõe</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {b.checkin_date} → {b.checkout_date} · {b.num_nights}n · {b.source}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {externalSiblings.length === 0 && websiteCandidates.length === 0 && (
          <p className="text-sm text-gray-500 mb-5">Sem reservas disponíveis para agrupar.</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              const siblings = externalSiblings.filter((b) => siblingIds.has(b.id));
              onConfirm(websiteParent, siblings);
            }}
            disabled={!websiteParent && siblingIds.size === 0}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {websiteParent ? `Ligar (${totalCount})` : `Agrupar (${totalCount})`}
          </button>
        </div>
      </div>
    </div>
  );
}
