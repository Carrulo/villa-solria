'use client';

import { useMemo, useRef, useState } from 'react';
import type { CleaningTask } from '@/lib/supabase';
import { CheckCircle2, Circle, Sparkles, Shirt, Lock, Camera, X as XIcon } from 'lucide-react';
import { CLEANING_SUBTASKS, checklistCount, isChecklistComplete } from '@/lib/cleaning-checklist';
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
                onPhotosUpdated={(updatedTask) =>
                  setTasks((prev) => prev.map((x) => (x.id === t.id ? updatedTask : x)))
                }
                onSaveNotes={(text) => update({ id: t.id, cleaner_notes: text })}
              />
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
  token,
  isTurn,
  isToday,
  busy,
  onToggleSubtask,
  onMarkLaundry,
  onUnmarkLaundry,
  onClose,
  onErrorMessage,
  onPhotosUpdated,
  onSaveNotes,
}: {
  task: CleaningTask;
  token: string;
  isTurn: boolean;
  isToday: boolean;
  busy: boolean;
  onToggleSubtask: (key: string, done: boolean) => void;
  onMarkLaundry: (rooms: number) => void;
  onUnmarkLaundry: () => void;
  onClose: () => void;
  onErrorMessage: (m: string) => void;
  onPhotosUpdated: (task: CleaningTask) => void;
  onSaveNotes: (text: string) => void;
}) {
  const overdue = task.cleaning_date < new Date().toISOString().slice(0, 10) && !task.cleaning_done;
  const taskAny = task as CleaningTask & {
    subtask_progress?: Record<string, boolean>;
    started_at?: string | null;
    completed_at?: string | null;
    photo_urls?: string[];
  };
  const rawProgress = taskAny.subtask_progress || {};
  const completed = !!taskAny.completed_at;
  // Skipped rooms (effective rooms_to_prepare excluded) count as done so
  // they don't block checklist completion or the close-cleaning button.
  // Use the same explicit/inferred resolver as the badge so the two stay
  // in sync.
  const effectiveForProgress = effectiveRoomsToPrepare(
    (task as CleaningTask & { rooms_to_prepare?: number[] | null }).rooms_to_prepare,
    task.num_guests,
    3
  );
  const progress: Record<string, boolean> = { ...rawProgress } as Record<string, boolean>;
  if (effectiveForProgress.rooms) {
    const allowed = effectiveForProgress.rooms;
    for (const n of [1, 2, 3]) {
      if (!allowed.includes(n)) progress[`quarto_${n}`] = true;
    }
  }
  const checklist = checklistCount(progress);
  const checklistDone = isChecklistComplete(progress);
  const photos = Array.isArray(taskAny.photo_urls) ? taskAny.photo_urls : [];
  const photoCount = photos.length;
  const canClose = !completed && !task.cleaning_paid && checklistDone && task.laundry_taken && photoCount >= 3;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [removingUrl, setRemovingUrl] = useState<string | null>(null);
  const initialNotes = (task as CleaningTask & { cleaner_notes?: string | null }).cleaner_notes || '';
  const [notes, setNotes] = useState(initialNotes);
  const [notesSaved, setNotesSaved] = useState(false);
  const notesDirty = notes.trim() !== initialNotes.trim();
  const ownerNotes = ((task as CleaningTask & { owner_notes?: string | null }).owner_notes || '').trim();
  const roomsToPrepareRaw = (task as CleaningTask & { rooms_to_prepare?: number[] | null }).rooms_to_prepare;
  // Effective rooms: explicit override > inferred from num_guests > all.
  // This way a 2-person booking does not get a full 3-bedroom prep by
  // default — the cleaner only makes Q1 unless the host says otherwise.
  const effective = effectiveRoomsToPrepare(roomsToPrepareRaw, task.num_guests, 3);
  const roomsToPrepare = effective.rooms;
  const roomsSource = effective.source;
  function isRoomSkipped(subtaskKey: string): boolean {
    if (!roomsToPrepare) return false;
    const m = subtaskKey.match(/^quarto_(\d+)$/);
    if (!m) return false;
    return !roomsToPrepare.includes(Number(m[1]));
  }
  // Collapsible checklist — auto-open only for today's tasks while
  // incomplete; future cards start collapsed so the cleaner doesn't
  // wade through 12 identical lists.
  const [checklistOpen, setChecklistOpen] = useState(isToday && !checklistDone && !completed);

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
                {roomsSource === 'inferred' && (
                  <span className="ml-1 text-[10px] text-amber-400/70">(auto)</span>
                )}
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

        {/* 1. Limpar — collapsible */}
        <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
          <button
            type="button"
            onClick={() => setChecklistOpen((v) => !v)}
            style={{ minHeight: 56 }}
            className="w-full flex items-center justify-between px-4 hover:bg-white/[0.03] active:bg-white/[0.05] transition-colors"
          >
            <SectionTitle n={1} label="Limpar" />
            <span className="flex items-center gap-3">
              <span className={`text-sm font-mono ${checklistDone ? 'text-green-300' : 'text-gray-400'}`}>
                {checklist.done}/{checklist.total}
                {checklistDone ? ' ✓' : ''}
              </span>
              <span
                className={`text-gray-400 text-base transition-transform ${checklistOpen ? 'rotate-180' : ''}`}
                aria-hidden
              >
                ▾
              </span>
            </span>
          </button>
          {checklistOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-3 pb-3 pt-1">
              {CLEANING_SUBTASKS.map((s) => {
                const done = progress[s.key] === true;
                const skipped = isRoomSkipped(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => editable && !busy && !skipped && onToggleSubtask(s.key, !done)}
                    disabled={busy || !editable || skipped}
                    style={{ minHeight: 48 }}
                    title={skipped ? 'Quarto não usado — só cobertor' : undefined}
                    className={`flex items-center gap-2.5 px-3 rounded-xl border text-left text-base disabled:opacity-60 active:scale-[0.98] transition-transform ${
                      skipped
                        ? 'bg-white/[0.02] border-white/5 text-gray-500 line-through'
                        : done
                        ? 'bg-green-500/15 border-green-500/40 text-green-200'
                        : 'bg-white/5 border-white/10 text-gray-200'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 size={18} className="shrink-0" />
                    ) : (
                      <Circle size={18} className="shrink-0 text-gray-500" />
                    )}
                    <span className="text-lg leading-none mr-1">{s.icon}</span>
                    <span className="truncate">
                      {s.label}
                      {skipped && <span className="ml-1 text-[10px] no-underline">(só cobertor)</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. Roupas */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between gap-2 px-1" style={{ minHeight: 32 }}>
            <SectionTitle n={2} label="Roupas" />
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

        {/* 3. Fotos */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between gap-2 px-1 mb-2.5" style={{ minHeight: 32 }}>
            <SectionTitle n={3} label="Fotos" />
            <span className={`text-sm font-mono ${photoCount >= 3 ? 'text-green-300' : 'text-gray-400'}`}>
              {photoCount}/3 {photoCount >= 3 && '✓'}
            </span>
          </div>
          {photoCount > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {photos.map((url) => (
                <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  {editable && (
                    <button
                      onClick={() => removePhoto(url)}
                      disabled={removingUrl === url}
                      style={{ minHeight: 28, minWidth: 28 }}
                      className="absolute top-1 right-1 rounded-full bg-black/70 text-white hover:bg-red-500/80 disabled:opacity-50 inline-flex items-center justify-center"
                      title="Remover"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          {editable && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ minHeight: 52 }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 active:bg-amber-500/40 text-amber-200 text-base font-semibold disabled:opacity-50"
              >
                <Camera size={20} />
                {uploading ? 'A enviar…' : photoCount === 0 ? 'Tirar fotos' : 'Adicionar mais'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) uploadFiles(e.target.files);
                }}
              />
            </>
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
          <button
            onClick={() => {
              if (!checklistDone) return onErrorMessage('Falta marcar a checklist.');
              if (!task.laundry_taken) return onErrorMessage('Falta indicar as roupas.');
              if (photoCount < 3) return onErrorMessage(`Faltam fotos (${photoCount}/3).`);
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
