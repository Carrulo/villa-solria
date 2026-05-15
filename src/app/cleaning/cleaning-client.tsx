'use client';

import { useMemo, useRef, useState } from 'react';
import type { CleaningTask } from '@/lib/supabase';
import { CheckCircle2, Sparkles, Shirt, Lock, ChevronLeft, ChevronRight } from 'lucide-react';
import { effectiveRoomsToPrepare } from '@/lib/cleaning-rooms';

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

  async function update(body: {
    id: string;
    cleaning_done?: boolean;
    laundry_taken?: boolean;
    rooms_with_laundry?: number;
    subtask_toggle?: { key: string; done: boolean };
    start?: boolean;
    close?: boolean;
    cleaner_notes?: string | null;
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
      const tt = t as CleaningTask & { completed_at?: string | null };
      const closed = !!tt.completed_at || (t.cleaning_done && t.laundry_taken);
      if (closed) {
        done.push(t);
        continue;
      }
      // Auto-arquivar: se a estadia já acabou há mais de 1 dia e a tarefa
      // ficou aberta, não interessa à equipa para o trabalho de hoje.
      // Aparece na aba "Feitas" para histórico, sem aparecer em "Hoje".
      const stayEnd = t.stay_checkout_date || t.cleaning_date;
      if (stayEnd < todayStr) {
        done.push(t);
        continue;
      }
      if (t.cleaning_date <= todayStr) {
        today.push(t);
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

  // Map: cleaning_date (YYYY-MM-DD) → { taskId, tab }. Lets the calendar
  // both highlight days with work and jump straight to the right card.
  const dateIndex = useMemo(() => {
    const m = new Map<string, { id: string; tab: Tab }>();
    for (const t of tabs.today) m.set(t.cleaning_date, { id: t.id, tab: 'today' });
    for (const t of tabs.upcoming) m.set(t.cleaning_date, { id: t.id, tab: 'upcoming' });
    for (const t of tabs.done) m.set(t.cleaning_date, { id: t.id, tab: 'done' });
    return m;
  }, [tabs]);

  // Set of days the villa is occupied (checkin → day before checkout).
  // Informative shade in the calendar so the cleaner can plan her own
  // schedule around occupied stretches without expecting work mid-stay.
  const occupiedDates = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) {
      if (!t.checkin_date || !t.stay_checkout_date) continue;
      const start = new Date(t.checkin_date + 'T00:00:00Z');
      const end = new Date(t.stay_checkout_date + 'T00:00:00Z');
      for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
        s.add(d.toISOString().slice(0, 10));
      }
    }
    return s;
  }, [tasks]);

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  function jumpToDate(date: string) {
    const target = dateIndex.get(date);
    if (!target) return;
    if (target.tab !== tab) setTab(target.tab);
    // Wait a tick so the tab content is rendered before scrolling.
    setTimeout(() => {
      const el = cardRefs.current.get(target.id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

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

        <MonthCalendar
          dateIndex={dateIndex}
          occupiedDates={occupiedDates}
          todayStr={todayStr}
          onPickDate={jumpToDate}
        />

        <div className="flex gap-2 mb-4 mt-4 overflow-x-auto">
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
              <div
                key={t.id}
                ref={(el) => {
                  if (el) cardRefs.current.set(t.id, el);
                  else cardRefs.current.delete(t.id);
                }}
              >
              <TaskCard
                task={t}
                isTurn={turnIds.has(t.id)}
                isToday={t.cleaning_date <= todayStr}
                busy={busyId === t.id}
                onToggleSubtask={(key, done) =>
                  update({ id: t.id, subtask_toggle: { key, done } })
                }
                onMarkLaundry={(rooms) =>
                  update({ id: t.id, laundry_taken: true, rooms_with_laundry: rooms })
                }
                onUnmarkLaundry={() =>
                  update({ id: t.id, laundry_taken: false, rooms_with_laundry: 0 })
                }
                onClose={() => update({ id: t.id, close: true })}
                onErrorMessage={(m) => {
                  setMessage(m);
                  setTimeout(() => setMessage(null), 3000);
                }}
                onSaveNotes={(text) => update({ id: t.id, cleaner_notes: text })}
              />
              </div>
            ))
          )}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-500">
          Dúvidas: WhatsApp ao Bruno
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
      style={{ minHeight: 44 }}
      className={`px-5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
        active
          ? 'bg-yellow-400 text-slate-900'
          : 'bg-white/5 text-gray-300 hover:bg-white/10 active:bg-white/15'
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
  onMarkLaundry,
  onUnmarkLaundry,
  onClose,
  onErrorMessage,
  onSaveNotes,
}: {
  task: CleaningTask;
  isTurn: boolean;
  isToday: boolean;
  busy: boolean;
  onToggleSubtask: (key: string, done: boolean) => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
  onClose: () => void;
  onErrorMessage: (m: string) => void;
  onSaveNotes: (text: string) => void;
}) {
  const overdue = task.cleaning_date < new Date().toISOString().slice(0, 10) && !task.cleaning_done;
  const taskAny = task as CleaningTask & {
    started_at?: string | null;
    completed_at?: string | null;
  };
  const completed = !!taskAny.completed_at;
  const canClose = !completed && !task.cleaning_paid && task.laundry_taken;
  const initialNotes = (task as CleaningTask & { cleaner_notes?: string | null }).cleaner_notes || '';
  const [notes, setNotes] = useState(initialNotes);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesDirty = notes.trim() !== initialNotes.trim();
  const ownerNotes = ((task as CleaningTask & { owner_notes?: string | null }).owner_notes || '').trim();
  const roomsToPrepareRaw = (task as CleaningTask & { rooms_to_prepare?: number[] | null }).rooms_to_prepare;
  // Effective rooms: explicit override > inferred from num_guests > all.
  // Shown only as a hint ("preparar Q1") — not enforced via checklist.
  const effective = effectiveRoomsToPrepare(roomsToPrepareRaw, task.num_guests, 3);
  const roomsToPrepare = effective.rooms;

  const editable = !completed && !task.cleaning_paid;

  return (
    <div
      className={`rounded-2xl p-4 border ${
        isTurn
          ? 'bg-red-500/10 border-red-500/40'
          : overdue
          ? 'bg-red-500/5 border-red-500/30'
          : 'bg-white/5 border-white/10'
      }`}
    >
      {/* Compact header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-base font-semibold text-white truncate">
            {formatShortDate(task.cleaning_date)}
            {task.guest_name && <span className="text-gray-400 font-normal"> · {task.guest_name.split(' ')[0]}</span>}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {task.num_guests ? `${task.num_guests} hósp · ` : ''}
            {task.stay_checkout_date && `${task.cleaning_date.slice(5)} → ${task.stay_checkout_date.slice(5)}`}
            {roomsToPrepare && (
              <span className="ml-1 text-amber-300">
                · só Q{roomsToPrepare.join(', Q')}
              </span>
            )}
          </p>
        </div>
        {isTurn && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/30 text-red-200 uppercase whitespace-nowrap">
            ⚡ Mesmo dia
          </span>
        )}
        {overdue && !isTurn && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300">atrasada</span>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {/* Owner note — message from Bruno to the cleaning team */}
        {ownerNotes && (
          <div className="rounded-2xl bg-amber-400/15 border border-amber-400/40 px-3 py-2.5 text-sm text-amber-100 whitespace-pre-wrap">
            <span className="mr-1">📝</span>
            {ownerNotes}
          </div>
        )}

        {/* Lembrete geral */}
        <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-gray-200">
          ✨ Limpar <strong>todos os quartos</strong> e não esquecer de organizar e limpar o <strong>terraço</strong> e <strong>varanda</strong>.
          {roomsToPrepare && (
            <div className="mt-2 rounded-xl bg-amber-400/15 border border-amber-400/40 px-3 py-2 text-amber-100">
              ⚠️ Esta reserva é só para <strong>Q{roomsToPrepare.join(', Q')}</strong> — não preparar os outros quartos.
            </div>
          )}
        </div>

        {/* Roupas */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between gap-2 px-1" style={{ minHeight: 32 }}>
            <SectionTitle n={1} label="Roupas" />
            {task.laundry_taken && (
              <span className="text-sm text-blue-300 flex items-center gap-1.5">
                <Shirt size={15} />
                {task.rooms_with_laundry === 0 ? 'sem' : `${task.rooms_with_laundry}q`}
                {!task.laundry_paid && editable && (
                  <button
                    onClick={onUnmarkLaundry}
                    disabled={busy}
                    className="ml-2 text-xs text-gray-400 hover:text-gray-200 underline"
                  >
                    corrigir
                  </button>
                )}
              </span>
            )}
          </div>
          {!task.laundry_taken && editable && (
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              <RoomButton disabled={busy} onClick={() => onMarkLaundry(0)} label="Sem" />
              {[1, 2, 3].map((n) => (
                <RoomButton key={n} disabled={busy} onClick={() => onMarkLaundry(n)} label={`${n}q`} />
              ))}
            </div>
          )}
        </div>

        {/* Notas livres */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-sm font-medium text-gray-200">Notas / avisos</span>
            {notesSaved && <span className="text-xs text-green-300">guardado ✓</span>}
          </div>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setNotesSaved(false);
            }}
            onBlur={() => {
              if (notesDirty) {
                onSaveNotes(notes);
                setNotesSaved(true);
                setTimeout(() => setNotesSaved(false), 1500);
              }
            }}
            disabled={!editable}
            rows={2}
            placeholder="ex: falta detergente, hóspede partiu vidro"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-base text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/40 disabled:opacity-60"
          />
        </div>

        {/* Close */}
        {completed ? (
          <div className="rounded-2xl bg-green-500/15 border border-green-500/30 px-4 py-3 text-base text-green-200 flex items-center gap-2">
            <CheckCircle2 size={18} />
            Fechada{taskAny.completed_at ? ` ${new Date(taskAny.completed_at).toLocaleDateString('pt-PT')}` : ''}
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-amber-400/15 border border-amber-400/40 px-4 py-3 text-sm text-amber-100 text-center">
              📸 Quando terminar, por favor envie as fotos da limpeza por <strong>WhatsApp</strong>.
            </div>
            <button
              onClick={() => {
                if (!task.laundry_taken) return onErrorMessage('Falta indicar as roupas.');
                onClose();
              }}
              disabled={busy || !canClose}
              style={{ minHeight: 56 }}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl text-base font-bold transition-colors ${
                canClose
                  ? 'bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-slate-900 shadow-lg shadow-yellow-400/20'
                  : 'bg-white/5 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Lock size={18} />
              Fechar limpeza
            </button>
          </>
        )}
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
      style={{ minHeight: 48 }}
      className="rounded-xl bg-white/5 hover:bg-blue-500/30 active:bg-blue-500/40 border border-white/10 hover:border-blue-500/40 text-gray-200 text-base font-medium disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function SectionTitle({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center text-base font-semibold text-gray-100">
      <span
        className="inline-flex items-center justify-center rounded-full bg-yellow-400/20 text-yellow-200 font-bold"
        style={{ width: 26, height: 26, fontSize: 13, marginRight: 10 }}
      >
        {n}
      </span>
      {label}
    </span>
  );
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return d
    .toLocaleDateString('pt-PT', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      timeZone: 'UTC',
    })
    .replace('.', '')
    .replace(',', '');
}

function MonthCalendar({
  dateIndex,
  occupiedDates,
  todayStr,
  onPickDate,
}: {
  dateIndex: Map<string, { id: string; tab: 'today' | 'upcoming' | 'done' }>;
  occupiedDates: Set<string>;
  todayStr: string;
  onPickDate: (date: string) => void;
}) {
  // Anchor month — defaults to the month with the next upcoming task,
  // or current month if there are none ahead.
  const initialMonth = useMemo(() => {
    const futureDates = Array.from(dateIndex.keys()).filter((d) => d >= todayStr).sort();
    const seed = futureDates[0] || todayStr;
    return seed.slice(0, 7); // YYYY-MM
  }, [dateIndex, todayStr]);

  const [ym, setYm] = useState<string>(initialMonth);
  const [year, month] = ym.split('-').map(Number);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYm(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }

  // Build a 6-row grid starting on Monday.
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const monthLabel = firstOfMonth.toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  // Monday = 0 ... Sunday = 6
  const firstDow = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(firstOfMonth.getUTCDate() - firstDow);

  const cells: { iso: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ iso, day: d.getUTCDate(), inMonth: d.getUTCMonth() + 1 === month });
  }

  const dows = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 mb-2">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => shiftMonth(-1)}
          className="p-2 rounded-lg hover:bg-white/10 active:bg-white/15 text-gray-300"
          aria-label="Mês anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-semibold text-gray-100 capitalize">
          {monthLabel}
        </span>
        <button
          onClick={() => shiftMonth(1)}
          className="p-2 rounded-lg hover:bg-white/10 active:bg-white/15 text-gray-300"
          aria-label="Próximo mês"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dows.map((d, i) => (
          <div key={i} className="text-center text-[10px] text-gray-500 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const has = dateIndex.has(c.iso);
          const isToday = c.iso === todayStr;
          const tab = has ? dateIndex.get(c.iso)!.tab : null;
          const isDone = tab === 'done';
          const isOccupied = !has && occupiedDates.has(c.iso);
          return (
            <button
              key={c.iso}
              disabled={!has}
              onClick={() => onPickDate(c.iso)}
              title={isOccupied ? 'Casa ocupada (hóspedes)' : undefined}
              className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                !c.inMonth
                  ? 'text-gray-700'
                  : has
                  ? isDone
                    ? 'bg-green-500/20 text-green-200 hover:bg-green-500/30 active:bg-green-500/40'
                    : 'bg-yellow-400/25 text-yellow-100 hover:bg-yellow-400/40 active:bg-yellow-400/50 font-bold'
                  : isOccupied
                  ? 'text-gray-500 line-through decoration-gray-500 decoration-1'
                  : 'text-gray-500'
              } ${isToday ? 'ring-2 ring-blue-400/60' : ''}`}
            >
              {c.day}
            </button>
          );
        })}
      </div>
      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[11px] text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-yellow-400/40" /> Limpeza
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded bg-green-500/30" /> Feita
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block text-gray-500 line-through decoration-1 leading-none">00</span> Ocupada
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded ring-2 ring-blue-400/60" /> Hoje
        </span>
      </div>
    </div>
  );
}
