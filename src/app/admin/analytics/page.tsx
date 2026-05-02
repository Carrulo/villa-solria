'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  ExternalLink,
  Users,
  UserPlus,
  MousePointerClick,
  Clock,
  Globe,
  Smartphone,
  FileText,
  Activity,
} from 'lucide-react';

interface Snapshot {
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    avgSessionDurationSec: number;
  };
  topPages: Array<{ path: string; views: number }>;
  topCountries: Array<{ country: string; users: number }>;
  topSources: Array<{ source: string; users: number }>;
  devices: Array<{ device: string; users: number }>;
  ratePerDay: Array<{ date: string; users: number }>;
  configured: boolean;
}

const VERCEL_DASHBOARD =
  'https://vercel.com/bruno-9770s-projects/villa-solria/analytics?environment=all';

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatGa4Date(yyyymmdd: string): string {
  if (yyyymmdd.length !== 8) return yyyymmdd;
  return `${yyyymmdd.slice(6, 8)}/${yyyymmdd.slice(4, 6)}`;
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<7 | 30>(7);
  const [data, setData] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/analytics?days=${days}`)
      .then((r) => r.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={24} /> Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visitantes, páginas e fontes do villasolria.com — via Google Analytics.
          </p>
        </div>
        <a
          href={VERCEL_DASHBOARD}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition"
        >
          <span>Vercel Analytics (cookieless 100%)</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Period switcher */}
      <div className="flex items-center gap-2">
        {([7, 30] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              days === d
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {d} dias
          </button>
        ))}
      </div>

      {/* Loading / not configured */}
      {loading && (
        <div className="bg-white border border-gray-100 rounded-xl p-12 text-center text-gray-400">
          A carregar…
        </div>
      )}

      {!loading && data && !data.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-sm text-amber-900">
            ⚠️ <strong>GA4 Data API não configurada.</strong> Falta definir
            <code className="bg-amber-100 px-1.5 py-0.5 rounded mx-1">GA4_SERVICE_ACCOUNT_JSON</code>
            e (opcional)
            <code className="bg-amber-100 px-1.5 py-0.5 rounded mx-1">GA4_PROPERTY_ID</code>
            nas variáveis de ambiente do Vercel. Entretanto usa o link
            &ldquo;Vercel Analytics&rdquo; em cima para ver dados.
          </p>
        </div>
      )}

      {!loading && data && data.configured && (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Tile icon={Users} label="Utilizadores activos" value={data.totals.activeUsers.toLocaleString('pt-PT')} />
            <Tile icon={UserPlus} label="Novos utilizadores" value={data.totals.newUsers.toLocaleString('pt-PT')} />
            <Tile icon={MousePointerClick} label="Sessões" value={data.totals.sessions.toLocaleString('pt-PT')} />
            <Tile icon={Clock} label="Duração média" value={formatDuration(data.totals.avgSessionDurationSec)} />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Panel title="Utilizadores por dia" icon={Activity}>
              <SimpleBarChart data={data.ratePerDay.map((r) => ({ label: formatGa4Date(r.date), value: r.users }))} />
            </Panel>
            <Panel title="Top páginas" icon={FileText}>
              <TopList data={data.topPages.map((p) => ({ label: p.path || '/', value: p.views }))} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Panel title="Top países" icon={Globe}>
              <TopList data={data.topCountries.map((c) => ({ label: c.country, value: c.users }))} />
            </Panel>
            <Panel title="Top fontes" icon={Activity}>
              <TopList data={data.topSources.map((s) => ({ label: s.source, value: s.users }))} />
            </Panel>
            <Panel title="Dispositivos" icon={Smartphone}>
              <TopList data={data.devices.map((d) => ({ label: d.device, value: d.users }))} />
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof BarChart3;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
        <Icon size={14} /> {title}
      </h3>
      {children}
    </div>
  );
}

function TopList({ data }: { data: Array<{ label: string; value: number }> }) {
  if (data.length === 0) {
    return <p className="text-xs text-gray-400 py-4">Sem dados</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="space-y-2">
      {data.map((row) => (
        <li key={row.label} className="flex items-center gap-3 text-sm">
          <span className="flex-1 truncate text-gray-700" title={row.label}>{row.label}</span>
          <span className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
            <span
              className="block h-full bg-primary"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="text-xs font-medium text-gray-600 w-10 text-right">{row.value}</span>
        </li>
      ))}
    </ul>
  );
}

function SimpleBarChart({ data }: { data: Array<{ label: string; value: number }> }) {
  if (data.length === 0) {
    return <p className="text-xs text-gray-400 py-4">Sem dados</p>;
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary rounded-t transition-all hover:bg-primary-hover"
            style={{ height: `${Math.max((d.value / max) * 100, 4)}%` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="text-[10px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}
