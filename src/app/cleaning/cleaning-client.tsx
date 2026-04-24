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
        {/* Checklist */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-200">Checklist da limpeza</p>
            <span className={`text-xs font-mono ${checklistDone ? 'text-green-300' : 'text-gray-400'}`}>
              {checklist.done}/{checklist.total}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {CLEANING_SUBTASKS.map((s) => {
              const done = progress[s.key] === true;
              return (
                <button
                  key={s.key}
                  onClick={() => !completed && !busy && onToggleSubtask(s.key, !done)}
                  disabled={busy || completed || task.cleaning_paid}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors text-sm disabled:opacity-60 ${
                    done
                      ? 'bg-green-500/10 border-green-500/30 text-green-200'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {done ? <CheckCircle2 size={16} className="shrink-0" /> : <Circle size={16} className="shrink-0 text-gray-500" />}
                  <span className="leading-none">{s.icon}</span>
                  <span className="truncate">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

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
              {[1, 2, 3].map((n) => (
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

        {/* Photos */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-amber-300" />
              <p className="text-sm font-medium text-gray-200">Fotos de prova</p>
            </div>
            <span className={`text-xs font-mono ${photoCount >= 3 ? 'text-green-300' : 'text-gray-400'}`}>
              {photoCount}/3 mín
            </span>
          </div>
          {photoCount > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-2">
              {photos.map((url) => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="prova" className="w-full h-full object-cover" />
                  {!completed && !task.cleaning_paid && (
                    <button
                      onClick={() => removePhoto(url)}
                      disabled={removingUrl === url}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white hover:bg-red-500/80 disabled:opacity-50"
                      title="Remover"
                    >
                      <XIcon size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {!completed && !task.cleaning_paid && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-sm font-medium disabled:opacity-50"
              >
                <Camera size={16} />
                {uploading ? 'A enviar…' : 'Tirar / escolher fotos'}
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
              <p className="text-[11px] text-gray-500 mt-1.5 text-center">
                Tirar fotos da cozinha, casa de banho e sala depois de limpar.
              </p>
            </>
          )}
        </div>

        {/* Close cleaning */}
        {completed ? (
          <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-3 text-sm text-green-200 flex items-center gap-2">
            <CheckCircle2 size={18} />
            Limpeza fechada{taskAny.completed_at ? ' em ' + new Date(taskAny.completed_at).toLocaleDateString('pt-PT') : ''}
          </div>
        ) : (
          <div className="space-y-1.5">
            <button
              onClick={() => {
                if (!checklistDone) {
                  onErrorMessage('Marca todos os items da checklist primeiro.');
                  return;
                }
                if (!task.laundry_taken) {
                  onErrorMessage('Indica quantos quartos têm roupa (ou "sem roupa").');
                  return;
                }
                if (photoCount < 3) {
                  onErrorMessage(`Faltam fotos de prova (${photoCount}/3 mínimo).`);
                  return;
                }
                onClose();
              }}
              disabled={busy || !canClose}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors ${
                canClose
                  ? 'bg-yellow-400 hover:bg-yellow-300 text-slate-900'
                  : 'bg-white/5 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Lock size={16} />
              Fechar limpeza
            </button>
            {!canClose && (
              <p className="text-[11px] text-gray-500 text-center">
                Falta: {!checklistDone && `checklist (${checklist.done}/${checklist.total})`}
                {!checklistDone && (!task.laundry_taken || photoCount < 3) && ' · '}
                {!task.laundry_taken && 'roupas'}
                {!task.laundry_taken && photoCount < 3 && ' · '}
                {photoCount < 3 && `fotos (${photoCount}/3)`}
              </p>
            )}
          </div>
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
