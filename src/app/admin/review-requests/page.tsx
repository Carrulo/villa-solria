'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Send, Check, Clock, CalendarDays } from 'lucide-react';

interface Row {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  checkin_date: string;
  checkout_date: string;
  language: string | null;
  source: string | null;
  review_requested_at: string | null;
  status?: string | null;
}

function isoToday(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function ptDate(iso: string): string {
  return new Date(iso + 'T00:00:00Z').toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function ReviewRequestsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  async function load() {
    setLoading(true);
    const today = isoToday();
    const from = addDays(today, -30);
    const to = addDays(today, 7);
    const { data } = await supabase
      .from('bookings')
      .select('id, guest_name, guest_email, checkin_date, checkout_date, language, source, review_requested_at, status')
      .in('source', ['website', 'manual'])
      .eq('status', 'confirmed')
      .gte('checkout_date', from)
      .lte('checkout_date', to)
      .order('checkout_date', { ascending: false });
    setRows((data || []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function sendNow(id: string) {
    setSending(id);
    try {
      const res = await fetch('/api/reviews/send-one', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        showToast(data.error || 'Erro ao enviar', 'err');
        return;
      }
      showToast('Email enviado', 'ok');
      await load();
    } catch {
      showToast('Erro de rede', 'err');
    } finally {
      setSending(null);
    }
  }

  const today = isoToday();
  const scheduledDay = addDays(today, -2);

  const groups = useMemo(() => {
    const dueNow: Row[] = [];
    const upcoming: Row[] = [];
    const sent: Row[] = [];
    for (const r of rows) {
      if (r.review_requested_at) {
        sent.push(r);
        continue;
      }
      if (!r.guest_email) continue;
      if (r.checkout_date <= scheduledDay) {
        dueNow.push(r);
      } else if (r.checkout_date <= addDays(today, 7)) {
        upcoming.push(r);
      }
    }
    dueNow.sort((a, b) => a.checkout_date.localeCompare(b.checkout_date));
    upcoming.sort((a, b) => a.checkout_date.localeCompare(b.checkout_date));
    sent.sort((a, b) => (b.review_requested_at || '').localeCompare(a.review_requested_at || ''));
    return { dueNow, upcoming, sent };
  }, [rows, today, scheduledDay]);

  function langBadge(lang: string | null) {
    const l = (lang || 'pt').toLowerCase();
    const colors: Record<string, string> = {
      pt: 'bg-green-500/20 text-green-300',
      en: 'bg-blue-500/20 text-blue-300',
      es: 'bg-amber-500/20 text-amber-300',
      de: 'bg-purple-500/20 text-purple-300',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${colors[l] || 'bg-white/10 text-gray-300'}`}>
        {l}
      </span>
    );
  }

  function scheduledLabel(checkoutDate: string): string {
    const send = addDays(checkoutDate, 2);
    if (send === today) return 'Hoje';
    if (send === addDays(today, 1)) return 'Amanhã';
    const diff = Math.round(
      (new Date(send + 'T00:00:00Z').getTime() - new Date(today + 'T00:00:00Z').getTime()) / 86400000,
    );
    if (diff < 0) return `Em atraso (${-diff}d)`;
    return `Em ${diff} dias (${ptDate(send)})`;
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos de avaliação</h1>
          <p className="text-xs text-gray-500 mt-1">
            Enviado automaticamente 2 dias após o check-out (09h Lisboa).
          </p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium"
        >
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">A carregar…</div>
      ) : (
        <>
          <Section
            title="A enviar hoje / em atraso"
            subtitle="Reservas cujo check-out foi há 2+ dias e ainda não foram contactadas."
            icon={<Clock size={16} className="text-amber-300" />}
            count={groups.dueNow.length}
          >
            {groups.dueNow.map((r) => (
              <RowCard
                key={r.id}
                r={r}
                rightSlot={
                  <button
                    onClick={() => sendNow(r.id)}
                    disabled={sending === r.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    <Send size={12} />
                    {sending === r.id ? 'A enviar…' : 'Enviar agora'}
                  </button>
                }
                langBadge={langBadge}
                scheduledLabel={scheduledLabel}
              />
            ))}
          </Section>

          <Section
            title="Próximos envios (7 dias)"
            subtitle="O cron diário trata destas automaticamente."
            icon={<CalendarDays size={16} className="text-blue-300" />}
            count={groups.upcoming.length}
          >
            {groups.upcoming.map((r) => (
              <RowCard
                key={r.id}
                r={r}
                rightSlot={
                  <span className="text-[11px] text-gray-300 px-2 py-1 rounded bg-white/5">
                    {scheduledLabel(r.checkout_date)}
                  </span>
                }
                langBadge={langBadge}
                scheduledLabel={scheduledLabel}
                showHelper={false}
              />
            ))}
          </Section>

          <Section
            title="Já enviados"
            subtitle="Últimos pedidos disparados (30 dias)."
            icon={<Check size={16} className="text-green-300" />}
            count={groups.sent.length}
          >
            {groups.sent.slice(0, 20).map((r) => (
              <RowCard
                key={r.id}
                r={r}
                rightSlot={
                  <span className="text-[11px] text-green-300 px-2 py-1 rounded bg-green-500/10 inline-flex items-center gap-1">
                    <Check size={12} />
                    {r.review_requested_at ? new Date(r.review_requested_at).toLocaleDateString('pt-PT') : 'enviado'}
                  </span>
                }
                langBadge={langBadge}
                scheduledLabel={scheduledLabel}
                showHelper={false}
              />
            ))}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon,
  count,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[#16213e] rounded-2xl border border-white/5 p-4 sm:p-5">
      <header className="flex items-start gap-2 mb-3">
        <span className="mt-0.5">{icon}</span>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            {title}
            <span className="text-[11px] font-normal text-gray-400 px-1.5 py-0.5 rounded bg-white/5">{count}</span>
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
        </div>
      </header>
      {count === 0 ? (
        <p className="text-sm text-gray-500 italic">—</p>
      ) : (
        <ul className="divide-y divide-white/5">{children}</ul>
      )}
    </section>
  );
}

function RowCard({
  r,
  rightSlot,
  langBadge,
  scheduledLabel,
  showHelper = true,
}: {
  r: Row;
  rightSlot: React.ReactNode;
  langBadge: (l: string | null) => React.ReactNode;
  scheduledLabel: (iso: string) => string;
  showHelper?: boolean;
}) {
  return (
    <li className="py-3 flex items-center gap-3 flex-wrap sm:flex-nowrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-white truncate">{r.guest_name || '(sem nome)'}</span>
          {langBadge(r.language)}
          <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-gray-400">{r.source}</span>
        </div>
        <div className="text-xs text-gray-400 mt-0.5 truncate">
          {r.guest_email || 'sem email'} · check-out {ptDate(r.checkout_date)}
          {showHelper && (
            <>
              {' '}
              · envio: <span className="text-gray-300">{scheduledLabel(r.checkout_date)}</span>
            </>
          )}
        </div>
      </div>
      <div className="shrink-0">{rightSlot}</div>
    </li>
  );
}
