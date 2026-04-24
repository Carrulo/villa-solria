'use client';

import { useMemo, useRef, useState } from 'react';
import type { CleaningTask } from '@/lib/supabase';
import { CheckCircle2, Circle, Sparkles, Shirt, Lock, Camera, X as XIcon } from 'lucide-react';
import { CLEANING_SUBTASKS, checklistCount, isChecklistComplete } from '@/lib/cleaning-checklist';

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
      // "Feitas" agora exige fechar formal — completed_at preenchido ao
      // carregar "Fechar limpeza" (que valida checklist + roupas + fotos).
      const tt = t as CleaningTask & { completed_at?: string | null };
      const closed = !!tt.completed_at || (t.cleaning_done && t.laundry_taken);
      if (closed) {
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
                token={token}
                isTurn={turnIds.has(t.id)}
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
                onPhotosUpdated={(updatedTask) =>
                  setTasks((prev) => prev.map((x) => (x.id === t.id ? updatedTask : x)))
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
  token,
  isTurn,
  busy,
  onToggleSubtask,
  onMarkLaundry,
  onUnmarkLaundry,
  onClose,
  onErrorMessage,
  onPhotosUpdated,
}: {
  task: CleaningTask;
  token: string;
  isTurn: boolean;
  busy: boolean;
  onToggleSubtask: (key: string, done: boolean) => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
  onClose: () => void;
  onErrorMessage: (m: string) => void;
  onPhotosUpdated: (task: CleaningTask) => void;
}) {
  const overdue = task.cleaning_date < new Date().toISOString().slice(0, 10) && !task.cleaning_done;
  const taskAny = task as CleaningTask & {
    subtask_progress?: Record<string, boolean>;
    started_at?: string | null;
    completed_at?: string | null;
    photo_urls?: string[];
  };
  const progress = taskAny.subtask_progress || {};
  const completed = !!taskAny.completed_at;
  const checklist = checklistCount(progress);
  const checklistDone = isChecklistComplete(progress);
  const photos = Array.isArray(taskAny.photo_urls) ? taskAny.photo_urls : [];
  const photoCount = photos.length;
  const canClose = !completed && !task.cleaning_paid && checklistDone && task.laundry_taken && photoCount >= 3;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);

  async function uploadFiles(files: FileList) {
    setUploading(true);
    let lastTask: CleaningTask | null = null;
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('token', token);
        fd.append('task_id', task.id);
        fd.append('file', file);
        const res = await fetch('/api/cleaning/photo-upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok) {
          onErrorMessage(data.error || 'Erro ao enviar foto');
          break;
        }
        if (data.task) lastTask = data.task as CleaningTask;
      }
    } finally {
      setUploading(false);
      if (lastTask) onPhotosUpdated(lastTask);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removePhoto(url: string) {
    setRemovingUrl(url);
    try {
      const params = new URLSearchParams({ token, task_id: task.id, url });
      const res = await fetch('/api/cleaning/photo-upload?' + params.toString(), { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        onErrorMessage(data.error || 'Erro ao remover');
        return;
      }
      if (data.task) onPhotosUpdated(data.task as CleaningTask);
    } finally {
      setRemovingUrl(null);
    }
  }

  const editable = !completed && !task.cleaning_paid;
  // Auto-open the checklist while still in progress so the user doesn't have
  // to tap to start. Closes itself once everything is ticked.
  const initiallyOpen = !checklistDone && !completed;

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

      <div className="mt-3 space-y-2">
        {/* 1. Checklist (collapsible) */}
        <details
          open={initiallyOpen}
          className="rounded-xl bg-white/5 border border-white/10 overflow-hidden group"
        >
          <summary className="flex items-center justify-between px-3 py-2.5 cursor-pointer select-none list-none">
            <span className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/10 text-[11px] font-bold flex items-center justify-center">1</span>
              Limpar
            </span>
            <span className={`text-xs font-mono ${checklistDone ? 'text-green-300' : 'text-gray-400'}`}>
              {checklist.done}/{checklist.total} {checklistDone && '✓'}
            </span>
          </summary>
          <div className="grid grid-cols-2 gap-1.5 p-3 pt-0">
            {CLEANING_SUBTASKS.map((s) => {
              const done = progress[s.key] === true;
              return (
                <button
                  key={s.key}
                  onClick={() => editable && !busy && onToggleSubtask(s.key, !done)}
                  disabled={busy || !editable}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-lg border text-left text-xs sm:text-sm disabled:opacity-60 ${
                    done
                      ? 'bg-green-500/10 border-green-500/30 text-green-200'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {done ? <CheckCircle2 size={14} className="shrink-0" /> : <Circle size={14} className="shrink-0 text-gray-500" />}
                  <span className="leading-none">{s.icon}</span>
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </details>

        {/* 2. Roupas */}
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/10 text-[11px] font-bold flex items-center justify-center">2</span>
              Roupas
            </span>
            {task.laundry_taken && (
              <span className="text-xs text-blue-300 flex items-center gap-1.5">
                <Shirt size={13} />
                {task.rooms_with_laundry === 0 ? 'sem' : `${task.rooms_with_laundry}q`}
                {!task.laundry_paid && editable && (
                  <button onClick={onUnmarkLaundry} disabled={busy} className="ml-1 text-[10px] text-gray-500 hover:text-gray-300 underline">corrigir</button>
                )}
              </span>
            )}
          </div>
          {!task.laundry_taken && editable && (
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              <RoomButton disabled={busy} onClick={() => onMarkLaundry(0)} label="Sem" />
              {[1, 2, 3].map((n) => (
                <RoomButton key={n} disabled={busy} onClick={() => onMarkLaundry(n)} label={`${n}q`} />
              ))}
            </div>
          )}
        </div>

        {/* 3. Fotos */}
        <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/10 text-[11px] font-bold flex items-center justify-center">3</span>
              Fotos
            </span>
            <span className={`text-xs font-mono ${photoCount >= 3 ? 'text-green-300' : 'text-gray-400'}`}>
              {photoCount}/3 {photoCount >= 3 && '✓'}
            </span>
          </div>
          {photoCount > 0 && (
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {photos.map((url) => (
                <div key={url} className="relative aspect-square rounded-md overflow-hidden bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {editable && (
                    <button
                      onClick={() => removePhoto(url)}
                      disabled={removingUrl === url}
                      className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-black/70 text-white hover:bg-red-500/80 disabled:opacity-50"
                      title="Remover"
                    >
                      <XIcon size={10} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {editable && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-sm font-medium disabled:opacity-50"
              >
                <Camera size={15} />
                {uploading ? 'A enviar…' : photoCount === 0 ? 'Tirar fotos' : 'Adicionar mais'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
                }}
              />
            </>
          )}
        </div>

        {/* Close */}
        {completed ? (
          <div className="rounded-xl bg-green-500/15 border border-green-500/30 px-3 py-2.5 text-sm text-green-200 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Fechada{taskAny.completed_at ? ` ${new Date(taskAny.completed_at).toLocaleDateString('pt-PT')}` : ''}
          </div>
        ) : (
          <button
            onClick={() => {
              if (!checklistDone) return onErrorMessage('Falta marcar a checklist.');
              if (!task.laundry_taken) return onErrorMessage('Falta indicar as roupas.');
              if (photoCount < 3) return onErrorMessage(`Faltam fotos (${photoCount}/3).`);
              onClose();
            }}
            disabled={busy || !canClose}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-colors ${
              canClose
                ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-900 shadow-lg shadow-yellow-400/20'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Lock size={15} />
            Fechar limpeza
          </button>
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
