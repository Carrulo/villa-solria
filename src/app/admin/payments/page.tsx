'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  Zap,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

/* ---------- types ---------- */
type Overview = {
  totalRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  pendingRevenue: number;
  upcomingRevenue: number;
  avgBookingValue: number;
  avgNights: number;
  conversionRate: number;
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
};

type Transaction = {
  id: string;
  total_price: number;
  status: string;
  payment_status: string;
  created_at: string;
  checkin_date: string;
  source: string;
};

type MonthRow = { month: string; revenue: number; bookings: number };

/* ---------- helpers ---------- */
function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '••••••••';
  return key.slice(0, 7) + '••••••••••••' + key.slice(-4);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
    paid: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
    refunded: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <span
      className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}
    >
      {status}
    </span>
  );
}

function fmt(n: number): string {
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

/* ========== COMPONENT ========== */
export default function PaymentsPage() {
  /* --- state --- */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Config
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [stripePublishable, setStripePublishable] = useState('');
  const [stripeSecret, setStripeSecret] = useState('');
  const [stripeWebhook, setStripeWebhook] = useState('');
  const [depositPercent, setDepositPercent] = useState('100');
  const [sessionTimeout, setSessionTimeout] = useState('30');

  // Edit state — when user wants to edit a masked key
  const [editingSecret, setEditingSecret] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  // Stats
  const [overview, setOverview] = useState<Overview | null>(null);
  const [monthly, setMonthly] = useState<MonthRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sources, setSources] = useState<Record<string, { count: number; revenue: number }>>({});

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* --- load --- */
  useEffect(() => {
    async function load() {
      // Load settings
      const { data: settings } = await supabase.from('settings').select('key, value');
      const s: Record<string, string> = {};
      (settings || []).forEach((r: { key: string; value: unknown }) => {
        s[r.key] = typeof r.value === 'string' ? r.value : String(r.value ?? '');
      });

      setPaymentsEnabled(s.payments_enabled !== 'false');
      setStripePublishable(s.stripe_publishable_key || '');
      setStripeSecret(s.stripe_secret_key || '');
      setStripeWebhook(s.stripe_webhook_secret || '');
      setDepositPercent(s.deposit_percent || '100');
      setSessionTimeout(s.session_timeout_min || '30');

      // Load stats
      try {
        const res = await fetch('/api/payments/stats');
        if (res.ok) {
          const data = await res.json();
          setOverview(data.overview);
          setMonthly(data.monthlyRevenue || []);
          setTransactions(data.recentTransactions || []);
          setSources(data.sources || {});
        }
      } catch {
        /* stats are optional */
      }

      setLoading(false);
    }
    load();
  }, []);

  /* --- save --- */
  async function handleSave() {
    setSaving(true);
    const pairs: Record<string, string> = {
      payments_enabled: paymentsEnabled ? 'true' : 'false',
      stripe_publishable_key: stripePublishable,
      deposit_percent: depositPercent,
      session_timeout_min: sessionTimeout,
    };

    // Only save secret keys if user explicitly edited them
    if (editingSecret && stripeSecret) {
      pairs.stripe_secret_key = stripeSecret;
    }
    if (editingWebhook && stripeWebhook) {
      pairs.stripe_webhook_secret = stripeWebhook;
    }

    for (const [key, value] of Object.entries(pairs)) {
      const { data: existing } = await supabase
        .from('settings')
        .select('key')
        .eq('key', key)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from('settings').update({ value }).eq('key', key);
      } else {
        await supabase.from('settings').insert({ key, value });
      }
    }

    setEditingSecret(false);
    setEditingWebhook(false);
    setSaving(false);
    showToast('Configurações guardadas', 'success');
  }

  /* --- test connection --- */
  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/payments/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setTestResult({
        ok: res.ok,
        msg: res.ok ? `Conectado ao Stripe (${data.mode || 'test'})` : data.error || 'Falha na conexão',
      });
    } catch {
      setTestResult({ ok: false, msg: 'Erro de rede' });
    }
    setTesting(false);
  }

  /* --- detect mode --- */
  const isLive = stripePublishable.startsWith('pk_live');
  const isTest = stripePublishable.startsWith('pk_test');

  /* --- max bar for chart --- */
  const maxRevenue = Math.max(...monthly.map((m) => m.revenue), 1);

  if (loading) {
    return <div className="text-gray-400">A carregar pagamentos...</div>;
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

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Pagamentos</h1>
          <p className="text-sm text-gray-400 mt-1">Stripe, configuração e métricas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode badge */}
          {stripePublishable && (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
                isLive
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-400' : 'bg-yellow-400'}`} />
              {isLive ? 'LIVE' : 'TEST'}
            </span>
          )}

          {/* Payments toggle */}
          <button
            onClick={() => setPaymentsEnabled(!paymentsEnabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              paymentsEnabled ? 'bg-green-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                paymentsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-300">{paymentsEnabled ? 'Activo' : 'Desactivado'}</span>
        </div>
      </div>

      {/* ===== KPI CARDS ===== */}
      {overview && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue this month */}
          <div className="bg-[#16213e] rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <DollarSign size={22} className="text-green-400" />
              {overview.revenueGrowth !== 0 && (
                <span
                  className={`flex items-center gap-0.5 text-xs font-medium ${
                    overview.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {overview.revenueGrowth > 0 ? (
                    <ArrowUpRight size={14} />
                  ) : (
                    <ArrowDownRight size={14} />
                  )}
                  {Math.abs(overview.revenueGrowth)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-white">{fmt(overview.thisMonthRevenue)}&euro;</p>
            <p className="text-sm text-gray-400 mt-1">Receita este mês</p>
            <p className="text-xs text-gray-500 mt-0.5">Mês anterior: {fmt(overview.lastMonthRevenue)}&euro;</p>
          </div>

          {/* Avg booking value */}
          <div className="bg-[#16213e] rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <BarChart3 size={22} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">{fmt(overview.avgBookingValue)}&euro;</p>
            <p className="text-sm text-gray-400 mt-1">Valor médio reserva</p>
            <p className="text-xs text-gray-500 mt-0.5">{overview.avgNights} noites em média</p>
          </div>

          {/* Conversion */}
          <div className="bg-[#16213e] rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp size={22} className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">{overview.conversionRate}%</p>
            <p className="text-sm text-gray-400 mt-1">Taxa de conversão</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {overview.paidBookings} pagas / {overview.totalBookings} total
            </p>
          </div>

          {/* Pending + Upcoming */}
          <div className="bg-[#16213e] rounded-2xl p-6 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <Clock size={22} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-white">{fmt(overview.upcomingRevenue)}&euro;</p>
            <p className="text-sm text-gray-400 mt-1">Receita futura confirmada</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {overview.pendingBookings} pagamento{overview.pendingBookings !== 1 ? 's' : ''} pendente{overview.pendingBookings !== 1 ? 's' : ''}: {fmt(overview.pendingRevenue)}&euro;
            </p>
          </div>
        </div>
      )}

      {/* ===== REVENUE CHART (simple bars) ===== */}
      {monthly.length > 0 && (
        <div className="bg-[#16213e] rounded-2xl p-6 border border-white/5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Receita Mensal (últimos 6 meses)
          </h2>
          <div className="flex items-end gap-3 h-40">
            {monthly.map((m) => {
              const pct = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
              const label = m.month.slice(5); // "MM"
              const monthNames: Record<string, string> = {
                '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
                '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
                '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
              };
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{fmt(m.revenue)}&euro;</span>
                  <div className="w-full bg-white/5 rounded-t-lg relative" style={{ height: '120px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-blue-500/60 rounded-t-lg transition-all"
                      style={{ height: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500">{monthNames[label] || label}</span>
                  <span className="text-[10px] text-gray-600">{m.bookings} res.</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== TWO-COL: CONFIG + SOURCES ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Stripe config (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stripe keys */}
          <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Shield size={16} />
                Configuração Stripe
              </h2>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
                Testar Conexão
              </button>
            </div>

            {testResult && (
              <div
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${
                  testResult.ok
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {testResult.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {testResult.msg}
              </div>
            )}

            {/* Publishable Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Chave Publicável
              </label>
              <input
                type="text"
                value={stripePublishable}
                onChange={(e) => setStripePublishable(e.target.value)}
                placeholder="pk_test_..."
                className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">Seguro para usar no browser (front-end)</p>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                Chave Secreta
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  PRIVADA
                </span>
              </label>
              <div className="relative">
                {editingSecret ? (
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={stripeSecret}
                    onChange={(e) => setStripeSecret(e.target.value)}
                    placeholder="sk_test_..."
                    className="w-full px-4 py-2.5 pr-20 bg-[#1a1a2e] border border-blue-500/30 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none font-mono"
                    autoFocus
                  />
                ) : (
                  <div className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-gray-400 text-sm font-mono flex items-center justify-between">
                    <span>{stripeSecret ? maskKey(stripeSecret) : 'Não configurada'}</span>
                    <button
                      onClick={() => {
                        setEditingSecret(true);
                        setStripeSecret('');
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-sans"
                    >
                      Editar
                    </button>
                  </div>
                )}
                {editingSecret && (
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Usada apenas no servidor. Nunca exposta ao browser.
                {editingSecret && (
                  <button
                    onClick={() => setEditingSecret(false)}
                    className="ml-2 text-yellow-400 hover:text-yellow-300"
                  >
                    Cancelar edição
                  </button>
                )}
              </p>
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
                Webhook Secret
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  PRIVADA
                </span>
              </label>
              <div className="relative">
                {editingWebhook ? (
                  <input
                    type={showWebhook ? 'text' : 'password'}
                    value={stripeWebhook}
                    onChange={(e) => setStripeWebhook(e.target.value)}
                    placeholder="whsec_..."
                    className="w-full px-4 py-2.5 pr-20 bg-[#1a1a2e] border border-blue-500/30 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none font-mono"
                    autoFocus
                  />
                ) : (
                  <div className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-gray-400 text-sm font-mono flex items-center justify-between">
                    <span>{stripeWebhook ? maskKey(stripeWebhook) : 'Não configurado'}</span>
                    <button
                      onClick={() => {
                        setEditingWebhook(true);
                        setStripeWebhook('');
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 font-sans"
                    >
                      Editar
                    </button>
                  </div>
                )}
                {editingWebhook && (
                  <button
                    type="button"
                    onClick={() => setShowWebhook(!showWebhook)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                  >
                    {showWebhook ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}
              </div>
              {editingWebhook && (
                <p className="text-xs text-gray-500 mt-1">
                  <button
                    onClick={() => setEditingWebhook(false)}
                    className="text-yellow-400 hover:text-yellow-300"
                  >
                    Cancelar edição
                  </button>
                </p>
              )}
            </div>

            {/* Divider */}
            <div className="border-t border-white/5 pt-5 space-y-5">
              {/* Deposit percent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Depósito no checkout (%)
                  </label>
                  <select
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  >
                    <option value="100">100% — Total no checkout</option>
                    <option value="50">50% — Metade agora, resto na chegada</option>
                    <option value="30">30% — Depósito de 30%</option>
                    <option value="0">0% — Sem pagamento online (modo consulta)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {depositPercent === '0'
                      ? 'O formulário funciona em modo consulta, sem Stripe'
                      : `O hóspede paga ${depositPercent}% no checkout`}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Expiração da sessão (minutos)
                  </label>
                  <select
                    value={sessionTimeout}
                    onChange={(e) => setSessionTimeout(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#1a1a2e] border border-white/10 rounded-xl text-white text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 outline-none"
                  >
                    <option value="15">15 minutos</option>
                    <option value="30">30 minutos</option>
                    <option value="60">60 minutos</option>
                    <option value="120">2 horas</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Se o hóspede não pagar neste tempo, a reserva é cancelada automaticamente
                  </p>
                </div>
              </div>
            </div>

            {/* Save */}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'A guardar...' : 'Guardar Configurações'}
              </button>
              {editingSecret || editingWebhook ? (
                <span className="text-xs text-yellow-400 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Chaves editadas serão guardadas
                </span>
              ) : null}
            </div>
          </div>

          {/* Webhook URL info */}
          <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap size={16} />
              Webhook Endpoint
            </h2>
            <div className="bg-[#1a1a2e] rounded-xl px-4 py-3 font-mono text-sm text-gray-300 flex items-center justify-between">
              <span>https://villa-solria.vercel.app/api/stripe/webhook</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText('https://villa-solria.vercel.app/api/stripe/webhook');
                  showToast('URL copiado', 'success');
                }}
                className="text-xs text-blue-400 hover:text-blue-300 font-sans ml-3"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Configure este URL no{' '}
              <a
                href="https://dashboard.stripe.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                Stripe Dashboard → Webhooks
              </a>
              {' '}para receber notificações de pagamento.
            </p>
          </div>
        </div>

        {/* RIGHT: Sources + quick stats (1 col) */}
        <div className="space-y-6">
          {/* Source breakdown */}
          {Object.keys(sources).length > 0 && (
            <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Users size={16} />
                Receita por Origem
              </h2>
              <div className="space-y-3">
                {Object.entries(sources)
                  .sort(([, a], [, b]) => b.revenue - a.revenue)
                  .map(([src, data]) => (
                    <div key={src} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm text-white capitalize">{src}</span>
                        <span className="text-xs text-gray-500 ml-2">{data.count} res.</span>
                      </div>
                      <span className="text-sm font-medium text-white">{fmt(data.revenue)}&euro;</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Totals summary */}
          {overview && (
            <div className="bg-[#16213e] rounded-2xl border border-white/5 p-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Calendar size={16} />
                Resumo Global
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Receita total</span>
                  <span className="text-sm font-medium text-white">{fmt(overview.totalRevenue)}&euro;</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Reservas pagas</span>
                  <span className="text-sm font-medium text-white">{overview.paidBookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Pagamentos pendentes</span>
                  <span className="text-sm font-medium text-yellow-400">{overview.pendingBookings}</span>
                </div>
                <div className="border-t border-white/5 pt-3 flex justify-between">
                  <span className="text-sm text-gray-400">Média por reserva</span>
                  <span className="text-sm font-bold text-white">{fmt(overview.avgBookingValue)}&euro;</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-400">Média noites</span>
                  <span className="text-sm font-bold text-white">{overview.avgNights}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== RECENT TRANSACTIONS ===== */}
      {transactions.length > 0 && (
        <div className="bg-[#16213e] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Transações Recentes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagamento</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-6 py-3 text-sm text-gray-300">
                      {tx.created_at?.slice(0, 10)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-300">{tx.checkin_date}</td>
                    <td className="px-6 py-3 text-sm text-white font-medium">{fmt(tx.total_price)}&euro;</td>
                    <td className="px-6 py-3">
                      <StatusBadge status={tx.status} />
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={tx.payment_status} />
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-400">{tx.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
