// Canonical list of subtasks the cleaning team must tick off before
// closing a cleaning. Order is preserved on the UI. The `key` is what
// gets persisted to cleaning_tasks.subtask_progress (a jsonb { key: true }
// map) and used to compute completeness.

export interface SubtaskDef {
  key: string;
  icon: string;
  label: string;
}

export const CLEANING_SUBTASKS: SubtaskDef[] = [
  { key: 'quarto_1', icon: '🛏️', label: 'Quarto 1' },
  { key: 'quarto_2', icon: '🛏️', label: 'Quarto 2' },
  { key: 'quarto_3', icon: '🛏️', label: 'Quarto 3' },
  { key: 'wc_1', icon: '🚽', label: 'Casa de banho 1' },
  { key: 'wc_2', icon: '🚽', label: 'Casa de banho 2' },
  { key: 'cozinha', icon: '🍳', label: 'Cozinha' },
  { key: 'sala_estar', icon: '🛋️', label: 'Sala de estar' },
  { key: 'sala_jantar', icon: '🍽️', label: 'Sala de jantar' },
  { key: 'varanda', icon: '🌤️', label: 'Varanda' },
  { key: 'terraco', icon: '🌅', label: 'Terraço' },
  { key: 'escadas', icon: '🪜', label: 'Escadas' },
  { key: 'hall', icon: '🚪', label: 'Hall de entrada' },
  { key: 'lixo', icon: '🗑️', label: 'Lixo retirado' },
  { key: 'roupas', icon: '🧺', label: 'Roupas trocadas' },
];

export const CLEANING_SUBTASK_KEYS = CLEANING_SUBTASKS.map((s) => s.key);

export function isChecklistComplete(progress: unknown): boolean {
  if (!progress || typeof progress !== 'object') return false;
  const map = progress as Record<string, unknown>;
  return CLEANING_SUBTASK_KEYS.every((k) => map[k] === true);
}

export function checklistCount(progress: unknown): { done: number; total: number } {
  const total = CLEANING_SUBTASK_KEYS.length;
  if (!progress || typeof progress !== 'object') return { done: 0, total };
  const map = progress as Record<string, unknown>;
  const done = CLEANING_SUBTASK_KEYS.reduce((acc, k) => acc + (map[k] === true ? 1 : 0), 0);
  return { done, total };
}
