'use client';

import { useMemo, useState } from 'react';
import type { CleaningTask } from '@/lib/supabase';
import { CheckCircle2, Circle, Sparkles, Shirt } from 'lucide-react';

type Tab = 'today' | 'upcoming' | 'done';

export default function CleaningClient({
  initialTasks,
  token,
}: {
  initialTasks: CleaningTask[];
  token: string;
}) {
  const [tasks, setTasks] = useState<CleaningTask[]>(initialTasks);
  const [tab, setTab] = useState<Tab>('today');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  async function callApi(body: {
    id: string;
    cleaning_done?: boolean;
    laundry_taken?: boolean;
    rooms_with_laundry?: number;
  }) {
    setBusyId(body.id);
    try {
      const res = await fetch('/api/cleaning/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Erro');
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      setTasks((prev) => prev.map((t) => (t.id === body.id ? { ...t, ...data.task } : t)));
    } finally {
      setBusyId(null);
    }
  }

  const tabs = useMemo(() => {
    const today: CleaningTask[] = [];
    const upcoming: CleaningTask[] = [];
    const done: CleaningTask[] = [];
    for (const t of tasks) {
      // "Feitas" só depois de ambas as partes resolvidas pela equipa:
      // limpeza marcada + decisão sobre as roupas (X quartos ou "sem roupa").
      const fullyMarked = t.cleaning_done && t.laundry_taken;
      if (fullyMarked) {
        done.push(t);
      } else if (t.cleaning_date <= todayStr) {
        today.push(t); // hoje + atrasadas
      } else {
        upcoming.push(t);
      }
    }
    return { today, upcoming, done };
  }, [tasks, todayStr]);

  const turnIds = useMemo(() => {
    const checkoutDays = new Set<string>();
    for (const t of tasks) if (t.stay_checkout_date) checkoutDays.add(t.stay_checkout_date);
    const ids = new Set<string>();
    for (const t of tasks) {
      if (checkoutDays.has(t.cleaning_date)) ids.add(t.id);
    }
    return ids;
  }, [tasks]);

  const visible =
    tab === 'today' ? tabs.today : tab === 'upcoming' ? tabs.upcoming : tabs.done;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-yellow-300" size={24} />
            Limpezas — Villa Solria
          </h1>
        </header>

        {message && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-red-500/15 text-red-300 text-sm">
            {message}
          </div>
        )}

        <div className="flex gap-2 mb-4 overflow-x-auto">
          <TabButton
            active={tab === 'today'}
            onClick={() => setTab('today')}
            label={`Hoje (${tabs.today.length})`}
          />
          <TabButton
            active={tab === 'upcoming'}
            onClick={() => setTab('upcoming')}
            label={`Próximas (${tabs.upcoming.length})`}
          />
          <TabButton
            active={tab === 'done'}
            onClick={() => setTab('done')}
            label={`Feitas (${tabs.done.length})`}
          />
        </div>

        <div className="space-y-3">
          {visible.length === 0 ? (
            <div className="text-gray-400 text-sm bg-white/5 rounded-xl p-6 text-center">
              Sem tarefas nesta lista.
            </div>
          ) : (
            visible.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                isTurn={turnIds.has(t.id)}
                busy={busyId === t.id}
                onToggleCleaning={() =>
                  callApi({ id: t.id, cleaning_done: !t.cleaning_done })
                }
                onMarkLaundry={(rooms) =>
                  callApi({ id: t.id, laundry_taken: true, rooms_with_laundry: rooms })
                }
                onUnmarkLaundry={() =>
                  callApi({ id: t.id, laundry_taken: false, rooms_with_laundry: 0 })
                }
              />
            ))
          )}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500">
          Marca as tarefas à medida que vais fazendo. Dúvidas? Manda SMS ao Bruno.
        </footer>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
        active
          ? 'bg-yellow-400 text-slate-900'
          : 'bg-white/5 text-gray-300 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

function TaskCard({
  task,
  isTurn,
  busy,
  onToggleCleaning,
  onMarkLaundry,
  onUnmarkLaundry,
}: {
  task: CleaningTask;
  isTurn: boolean;
  busy: boolean;
  onToggleCleaning: () => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
}) {
  const overdue = task.cleaning_date < new Date().toISOString().slice(0, 10) && !task.cleaning_done;

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border ${
        isTurn
          ? 'bg-red-500/10 border-red-500/40'
          : overdue
          ? 'bg-red-500/5 border-red-500/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-white">
            {formatLongDate(task.cleaning_date)}
          </p>
          {task.guest_name && (
            <p className="text-sm text-gray-400">
              {task.guest_name}
              {task.num_guests ? ` · ${task.num_guests} hóspede(s)` : ''}
            </p>
          )}
          {task.stay_checkout_date && (
            <p className="text-xs text-gray-500 mt-1">
              Estadia {task.cleaning_date.slice(5)} → {task.stay_checkout_date.slice(5)}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1 items-end">
          {isTurn && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/30 text-red-200 uppercase">
              Mesmo dia ⚡
            </span>
          )}
          {overdue && !isTurn && (
            <span className="px-2 py-1 rounded-full text-xs bg-red-500/20 text-red-300">
              atrasada
            </span>
          )}
        </div>
      </div>
      {isTurn && (
        <p className="mt-2 text-xs text-red-200">
          ⚠️ Outro hóspede entra neste dia. Limpar o quanto antes após check-out.
        </p>
      )}

      <div className="mt-4 space-y-3">
        <button
          onClick={onToggleCleaning}
          disabled={busy || task.cleaning_paid}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${
            task.cleaning_done
              ? 'bg-green-500/10 border-green-500/30 text-green-300'
              : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
          } disabled:opacity-60`}
        >
          {task.cleaning_done ? (
            <CheckCircle2 size={22} />
          ) : (
            <Circle size={22} className="text-gray-400" />
          )}
          <span className="text-sm font-medium">
            {task.cleaning_done ? 'Limpeza feita' : 'Marcar limpeza como feita'}
          </span>
        </button>

        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Shirt size={18} className="text-blue-300" />
            <p className="text-sm text-gray-200">Roupas levadas?</p>
          </div>

          {task.laundry_taken ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-300">
                ✓ {task.rooms_with_laundry} quarto{task.rooms_with_laundry !== 1 ? 's' : ''}
              </p>
              {!task.laundry_paid && (
                <button
                  onClick={onUnmarkLaundry}
                  disabled={busy}
                  className="text-xs text-gray-400 hover:text-gray-200 disabled:opacity-60"
                >
                  corrigir
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <RoomButton disabled={busy} onClick={() => onMarkLaundry(0)} label="Sem roupa" />
              {[1, 2, 3, 4].map((n) => (
                <RoomButton
                  key={n}
                  disabled={busy}
                  onClick={() => onMarkLaundry(n)}
                  label={`${n} quarto${n > 1 ? 's' : ''}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoomButton({
  disabled,
  onClick,
  label,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-blue-500/30 border border-white/10 hover:border-blue-500/40 text-gray-200 text-sm disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function formatLongDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('pt-PT', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  });
}
