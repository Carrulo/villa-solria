// Builds the WhatsApp message the host sends to the cleaner.
//
// What the cleaner actually needs to decide her day (see turnover
// guidance from Hostfully/Uplisting): which kind of clean this is —
// a same-day turnover with a hard window, or a clean with no arrival
// behind it — plus the exact hours, and which rooms get fresh linen.
// Everything else is noise on a phone screen.
//
// House rule: guests leave by 11h, new guests arrive from 16h, so a
// same-day turnover must happen inside that window.

import { describeRoom, shortRoom, roomProfile, MAX_GUESTS } from './villa-rooms';

export const CHECKOUT_HOUR = '11h';
export const CHECKIN_HOUR = '16h';

export interface CleaningMessageTask {
  cleaning_date: string; // YYYY-MM-DD — the checkout day
  guest_name: string | null;
  rooms_to_prepare: number[] | null; // null/empty = every room
  /** People per room, e.g. {"1": 2, "3": 1}. Takes precedence when set. */
  room_plan: Record<string, number> | null;
  towels_override: number | null;
  owner_notes: string | null;
  num_guests: number | null;
}

/** Rooms with at least one person, in order. */
export function occupiedRooms(plan: Record<string, number> | null | undefined): number[] {
  if (!plan) return [];
  return Object.entries(plan)
    .filter(([, people]) => Number(people) > 0)
    .map(([n]) => Number(n))
    .sort((a, b) => a - b);
}

export function totalGuests(plan: Record<string, number> | null | undefined): number {
  if (!plan) return 0;
  return Object.values(plan).reduce((sum, n) => sum + (Number(n) || 0), 0);
}

/**
 * One line per room saying how many beds to make. The twin room is why
 * this is needed: one child in there means one bed made, not two.
 */
function roomLine(n: number, people: number): string {
  const r = roomProfile(n);
  const head = `• ${describeRoom(n)}`;
  if (r.bedCount > 1) {
    if (people >= r.bedCount) return `${head}\n   → fazer as ${r.bedCount} camas (${people} pessoas)`;
    const spare = r.bedCount - people;
    return `${head}\n   → ${people} pessoa${people === 1 ? '' : 's'}: fazer só ${people} cama${
      people === 1 ? '' : 's'
    }, ${spare === 1 ? 'a outra fica' : 'as outras ficam'} só com a coberta`;
  }
  if (people >= 2) return `${head}\n   → casal (2 pessoas)`;
  return `${head}\n   → 1 pessoa`;
}

export interface UpcomingCleaning {
  cleaning_date: string;
  isTurn: boolean;
}

const WEEKDAYS = [
  'domingo',
  'segunda',
  'terça',
  'quarta',
  'quinta',
  'sexta',
  'sábado',
];

const MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** "2026-09-05" → "sábado, 5 set" */
export function formatPtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[date.getUTCDay()]}, ${d} ${MONTHS[m - 1]}`;
}

/** [1, 2] → "Q1 Principal e Q2 Queen" */
function listRooms(rooms: number[]): string {
  const labels = rooms.map((n) => shortRoom(n));
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} e ${labels[labels.length - 1]}`;
}

export function buildCleaningMessage({
  task,
  isTurn,
  upcoming,
  villaRooms,
}: {
  task: CleaningMessageTask;
  /** Another stay checks in on this cleaning day. */
  isTurn: boolean;
  upcoming: UpcomingCleaning[];
  villaRooms: number;
}): string {
  const lines: string[] = [];

  lines.push(`🧹 *Limpeza — ${formatPtDate(task.cleaning_date)}*`);
  lines.push('');

  // 1. The window. This is the part that changes how she plans the day.
  lines.push(`Saída dos hóspedes: ${CHECKOUT_HOUR}`);
  if (isTurn) {
    lines.push(`Entrada dos próximos: ${CHECKIN_HOUR}, no mesmo dia`);
    lines.push(`⏱ *A limpeza tem de ficar feita entre as ${CHECKOUT_HOUR} e as ${CHECKIN_HOUR}.*`);
  } else {
    lines.push('Sem entrada marcada a seguir.');
    lines.push('Mesmo assim deixamos a casa pronta — pode ser sem pressa de horário.');
  }

  // 2. Rooms + linen. Skipping unused rooms is the point: no need to
  //    wash linen for bedrooms nobody slept in.
  lines.push('');
  const planned = occupiedRooms(task.room_plan);
  const allRooms = Array.from({ length: villaRooms }, (_, i) => i + 1);

  if (planned.length > 0) {
    // Best case: the host said who sleeps where.
    const guests = totalGuests(task.room_plan);
    lines.push('🛏 *Preparar:*');
    for (const n of planned) lines.push(roomLine(n, Number(task.room_plan?.[String(n)]) || 0));

    const untouched = allRooms.filter((n) => !planned.includes(n));
    if (untouched.length > 0) {
      lines.push('');
      lines.push(`❌ Não mexer: ${listRooms(untouched)} — fica só a coberta, sem lavar roupa.`);
    }

    const towels = task.towels_override ?? guests;
    lines.push('');
    lines.push(`🧺 *Toalhas: ${towels}* (${guests} hóspede${guests === 1 ? '' : 's'}${
      guests >= MAX_GUESTS ? ', casa cheia' : ''
    })`);
  } else {
    // Fallback: only a room list, or nothing at all.
    const explicit =
      Array.isArray(task.rooms_to_prepare) &&
      task.rooms_to_prepare.length > 0 &&
      task.rooms_to_prepare.length < villaRooms
        ? [...task.rooms_to_prepare].sort((a, b) => a - b)
        : null;

    if (explicit) {
      lines.push('🛏 *Preparar só estes quartos:*');
      for (const n of explicit) lines.push(`• ${describeRoom(n)}`);
      const rest = allRooms.filter((n) => !explicit.includes(n));
      if (rest.length > 0) {
        lines.push('');
        lines.push(`❌ Não mexer: ${listRooms(rest)} — fica só a coberta, sem lavar roupa.`);
      }
    } else {
      lines.push(`🛏 *Preparar os ${villaRooms} quartos:*`);
      for (const n of allRooms) lines.push(`• ${describeRoom(n)}`);
    }

    if (task.towels_override != null) {
      lines.push('');
      lines.push(`🧺 *Toalhas: ${task.towels_override}*`);
    } else if (task.num_guests != null) {
      lines.push('');
      lines.push(
        `🧺 *Toalhas: ${task.num_guests}* (${task.num_guests} hóspede${
          task.num_guests === 1 ? '' : 's'
        }${task.num_guests >= MAX_GUESTS ? ', casa cheia' : ''})`
      );
    }
  }

  // 3. Anything the host typed for this specific stay.
  const note = (task.owner_notes || '').trim();
  if (note) {
    lines.push('');
    lines.push(`📝 ${note}`);
  }

  // 4. What's coming, so she can plan her own week.
  if (upcoming.length > 0) {
    lines.push('');
    lines.push('*Próximas limpezas:*');
    for (const u of upcoming) {
      const when = formatPtDate(u.cleaning_date);
      lines.push(
        u.isTurn
          ? `• ${when} — com entrada no mesmo dia (${CHECKOUT_HOUR}–${CHECKIN_HOUR})`
          : `• ${when} — sem entrada a seguir`
      );
    }
    lines.push('');
    lines.push('_Podem aparecer mais reservas; aviso se mudar._');
  }

  return lines.join('\n');
}
