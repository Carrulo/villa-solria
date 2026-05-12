'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/lib/supabase';
import { CheckCircle, Copy, ExternalLink, FileText, RefreshCw } from 'lucide-react';

type InvoiceDetails = {
  company?: string;
  vat?: string;
  address?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  email?: string;
  amount?: string;
  issued_at?: string | null;
};

type Row = Booking & { invoice_details?: InvoiceDetails | null };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(iso: string): number {
  const t = new Date(todayIso() + 'T00:00:00Z').getTime();
  const c = new Date(iso + 'T00:00:00Z').getTime();
  return Math.round((t - c) / 86400000);
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .not('invoice_details', 'is', null)
      .order('checkout_date', { ascending: false });
    setRows((data || []) as Row[]);
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  async function markIssued(row: Row) {
    setBusy(row.id);
    const next: InvoiceDetails = { ...(row.invoice_details ?? {}), issued_at: new Date().toISOString() };
    const { error } = await supabase
      .from('bookings')
      .update({ invoice_details: next })
      .eq('id', row.id);
    setBusy(null);
    if (error) {
      showToast('Erro: ' + error.message);
      return;
    }
    showToast('Marcada como emitida');
    await load();
  }

  async function unmarkIssued(row: Row) {
    setBusy(row.id);
    const next: InvoiceDetails = { ...(row.invoice_details ?? {}) };
    delete next.issued_at;
    const { error } = await supabase
      .from('bookings')
      .update({ invoice_details: next })
      .eq('id', row.id);
    setBusy(null);
    if (error) {
      showToast('Erro: ' + error.message);
      return;
    }
    showToast('Reaberta');
    await load();
  }

  async function copyAll(row: Row) {
    const inv = row.invoice_details!;
    const text = [
      row.guest_name,
      inv.company,
      `NIF: ${inv.vat}`,
      inv.address,
      `${inv.postal_code || ''} ${inv.city || ''}`.trim(),
      inv.country,
      inv.email,
      inv.amount ? `Valor: €${inv.amount}` : null,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      showToast('Dados copiados');
    } catch {
      prompt('Copia os dados:', text);
    }
  }

  const { pending, issued } = useMemo(() => {
    const p: Row[] = [];
    const i: Row[] = [];
    for (const r of rows) {
      if (r.invoice_details?.issued_at) i.push(r);
      else p.push(r);
    }
    // Pending sorted by oldest checkout first (most urgent on top).
    p.sort((a, b) => a.checkout_date.localeCompare(b.checkout_date));
    return { pending: p, issued: i };
  }, [rows]);

  const overdueCount = pending.filter((r) => daysSince(r.checkout_date) >= 2).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText size={22} /> Faturas
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Pedidos de fatura B2B dos hóspedes. Emite no Portal das Finanças e marca como feito.
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Counter chips */}
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 rounded bg-amber-500/15 text-amber-200 font-semibold">
          {pending.length} por emitir
        </span>
        {overdueCount > 0 && (
          <span className="px-2 py-1 rounded bg-red-500/20 text-red-200 font-semibold">
            {overdueCount} em atraso
          </span>
        )}
        <span className="px-2 py-1 rounded bg-green-500/10 text-green-200">
          {issued.length} emitidas
        </span>
      </div>

      {/* Pending section */}
      <section>
        <h2 className="text-sm font-semibold text-amber-200 uppercase tracking-wider mb-3">
          Por emitir
        </h2>
        {loading ? (
          <p className="text-sm text-gray-500">A carregar...</p>
        ) : pending.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center">
            <p className="text-sm text-gray-400">🎉 Nenhuma fatura pendente — tudo emitido!</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {pending.map((r) => {
              const inv = r.invoice_details!;
              const days = daysSince(r.checkout_date);
              let badge: { label: string; cls: string };
              if (days < 0) {
                badge = { label: `Daqui a ${Math.abs(days)}d`, cls: 'bg-blue-500/20 text-blue-200' };
              } else if (days === 0) {
                badge = { label: 'HOJE', cls: 'bg-amber-500/30 text-amber-100' };
              } else if (days === 1) {
                badge = { label: 'ONTEM', cls: 'bg-orange-500/30 text-orange-100' };
              } else {
                badge = { label: `EM ATRASO · ${days}d`, cls: 'bg-red-500/30 text-red-100' };
              }
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-sm font-semibold text-white">{r.guest_name}</span>
                      {inv.amount && (
                        <span className="text-sm text-amber-200 font-mono">€{inv.amount}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyAll(r)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-xs"
                        title="Copiar dados para o Portal das Finanças"
                      >
                        <Copy size={12} /> Copiar
                      </button>
                      <a
                        href="https://www.portaldasfinancas.gov.pt/at/html/index.html"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-500 text-white text-xs"
                      >
                        <ExternalLink size={12} /> Portal das Finanças
                      </a>
                      <button
                        onClick={() => markIssued(r)}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-600/80 hover:bg-green-500 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        <CheckCircle size={12} /> {busy === r.id ? '…' : 'Marcar emitida'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-300">
                    <div><span className="text-gray-500">Empresa:</span> {inv.company || '—'}</div>
                    <div><span className="text-gray-500">NIF/VAT:</span> <span className="font-mono">{inv.vat || '—'}</span></div>
                    <div className="sm:col-span-2"><span className="text-gray-500">Morada:</span> {inv.address || '—'}{inv.postal_code ? `, ${inv.postal_code}` : ''}{inv.city ? ` ${inv.city}` : ''}{inv.country ? ` (${inv.country})` : ''}</div>
                    <div><span className="text-gray-500">Email:</span> {inv.email || '—'}</div>
                    <div><span className="text-gray-500">Check-out:</span> {r.checkout_date}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Issued history */}
      {issued.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-green-300 uppercase tracking-wider mb-3">
            Histórico — emitidas
          </h2>
          <ul className="space-y-1.5">
            {issued.slice(0, 30).map((r) => {
              const inv = r.invoice_details!;
              return (
                <li
                  key={r.id}
                  className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 flex items-center justify-between gap-3 flex-wrap"
                >
                  <div className="flex items-center gap-2 text-xs text-gray-300 flex-wrap">
                    <CheckCircle size={12} className="text-green-400" />
                    <span className="font-medium text-white">{r.guest_name}</span>
                    <span className="text-gray-400">·</span>
                    <span>{inv.company || '(sem empresa)'}</span>
                    <span className="text-gray-400">·</span>
                    <span className="font-mono">{inv.vat || '—'}</span>
                    {inv.amount && (
                      <>
                        <span className="text-gray-400">·</span>
                        <span className="font-mono text-green-300">€{inv.amount}</span>
                      </>
                    )}
                    <span className="text-gray-400">·</span>
                    <span className="text-gray-500">
                      Emitida em {inv.issued_at?.slice(0, 10)}
                    </span>
                  </div>
                  <button
                    onClick={() => unmarkIssued(r)}
                    disabled={busy === r.id}
                    className="text-[10px] text-gray-500 hover:text-amber-300 underline disabled:opacity-50"
                    title="Reabrir (engano)"
                  >
                    reabrir
                  </button>
                </li>
              );
            })}
          </ul>
          {issued.length > 30 && (
            <p className="text-[11px] text-gray-500 mt-2">
              Mostrando 30 mais recentes de {issued.length} total.
            </p>
          )}
        </section>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 px-4 py-2 rounded-lg bg-gray-900 border border-white/10 text-sm text-white shadow-2xl">
          {toast}
        </div>
      )}
    </div>
  );
}
