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

import {
  describeRoom,
  shortRoom,
  roomProfile,
  BATHROOMS,
  MAX_GUESTS,
  COT_ROOM,
  COT_LABEL,
} from './villa-rooms';

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
  /** A mid-stay intervention is a different job to a turnover. */
  kind?: 'turnover' | 'midstay';
  /** Set up the cot in Q1. Off unless a baby is actually coming. */
  needs_cot?: boolean | null;
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
function roomLine(n: number, people: number, needsCot = false): string {
  const r = roomProfile(n);
  const head = `• ${describeRoom(n)}${cotSuffix(n, needsCot)}`;
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

/** " + berço" on the room that holds it, and only when asked for. */
function cotSuffix(n: number, needsCot: boolean): string {
  return needsCot && n === COT_ROOM ? ` + ${COT_LABEL}` : '';
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

/**
 * Booking.com sends every reservation as "CLOSED - Not available" with
 * no guest name, and Airbnb sends "Reserved". Neither is a person.
 */
export function displayGuestName(raw: string | null | undefined): string | null {
  const name = (raw || '').trim();
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.startsWith('closed') || lower.includes('not available')) return null;
  if (lower === 'reserved') return null;
  return name;
}

/** "Olá Leonor 👋" — skipped when no name is on file. */
function greeting(cleanerName?: string | null): string[] {
  const name = (cleanerName || '').trim();
  return name ? [`Olá ${name} 👋`, ''] : [];
}

export function buildCleaningMessage({
  task,
  isTurn,
  upcoming,
  villaRooms,
  cleanerName,
  nextGuest,
}: {
  task: CleaningMessageTask;
  /** Another stay checks in on this cleaning day. */
  isTurn: boolean;
  upcoming: UpcomingCleaning[];
  villaRooms: number;
  cleanerName?: string | null;
  /** Who arrives on this same day, when it's a turnover. */
  nextGuest?: { name: string | null; checkoutDate: string | null } | null;
}): string {
  if (task.kind === 'midstay') {
    return buildMidstayMessage(task, villaRooms, cleanerName);
  }

  const lines: string[] = greeting(cleanerName);
  const needsCot = task.needs_cot === true;

  lines.push(`🧹 *Limpeza — ${formatPtDate(task.cleaning_date)}*`);
  lines.push('');

  // 1. The window, and who is on each side of it. Naming both makes it
  //    obvious this is not the departing guest's own cleaning.
  const leaving = displayGuestName(task.guest_name);
  lines.push(`Sai: ${leaving ? `${leaving}, ` : ''}até às ${CHECKOUT_HOUR}`);
  if (isTurn) {
    const arriving = displayGuestName(nextGuest?.name);
    const until = nextGuest?.checkoutDate ? `, fica até ${formatPtDate(nextGuest.checkoutDate)}` : '';
    lines.push(`Entra: ${arriving ? arriving : 'hóspede novo'}, a partir das ${CHECKIN_HOUR}${until}`);
    lines.push(`⏱ *A limpeza tem de ficar feita entre as ${CHECKOUT_HOUR} e as ${CHECKIN_HOUR}.*`);
  } else {
    lines.push('Não entra ninguém a seguir.');
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
    for (const n of planned)
      lines.push(roomLine(n, Number(task.room_plan?.[String(n)]) || 0, needsCot));

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
      for (const n of explicit) lines.push(`• ${describeRoom(n)}${cotSuffix(n, needsCot)}`);
      const rest = allRooms.filter((n) => !explicit.includes(n));
      if (rest.length > 0) {
        lines.push('');
        lines.push(`❌ Não mexer: ${listRooms(rest)} — fica só a coberta, sem lavar roupa.`);
      }
    } else {
      lines.push(`🛏 *Preparar os ${villaRooms} quartos:*`);
      for (const n of allRooms) lines.push(`• ${describeRoom(n)}${cotSuffix(n, needsCot)}`);
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

  if (needsCot) {
    lines.push('');
    lines.push(`👶 *Montar o ${COT_LABEL}* no ${shortRoom(COT_ROOM)}.`);
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

/**
 * The week-ahead message: which days she has work, and whether each one
 * is pinned to the 11h-16h window. Details of each job (rooms, towels)
 * still go out per cleaning, closer to the day.
 */
export function buildUpcomingMessage(
  upcoming: UpcomingCleaning[],
  cleanerName?: string | null
): string {
  const name = (cleanerName || '').trim();
  if (upcoming.length === 0) {
    return `Olá${name ? ` ${name}` : ''}! Para já não há limpezas marcadas. Aviso assim que entrar alguma reserva.`;
  }
  const lines: string[] = [
    ...greeting(cleanerName),
    '🧹 *Próximas limpezas — Villa Solria*',
    '',
  ];
  for (const u of upcoming) {
    lines.push(
      u.isTurn
        ? `• ${formatPtDate(u.cleaning_date)} — entra gente no mesmo dia, tem de ficar feita entre as ${CHECKOUT_HOUR} e as ${CHECKIN_HOUR}`
        : `• ${formatPtDate(u.cleaning_date)} — sem entrada a seguir, sem pressa de horário`
    );
  }
  lines.push('');
  lines.push('_Mando os quartos e as toalhas de cada uma mais perto do dia. Podem aparecer mais reservas._');
  return lines.join('\n');
}

/**
 * Mid-stay intervention on a long booking: swap the linen and towels,
 * clean the bathrooms, leave everything else exactly as the guests left
 * it. No checkout window applies — the hour is agreed with them.
 */
function buildMidstayMessage(
  task: CleaningMessageTask,
  villaRooms: number,
  cleanerName?: string | null
): string {
  const lines: string[] = greeting(cleanerName);
  lines.push(`🧼 *Limpeza a meio da estadia — ${formatPtDate(task.cleaning_date)}*`);
  lines.push('');
  lines.push(
    'Os hóspedes continuam na casa e as coisas deles estão espalhadas — *não arrumar nem mexer nos pertences*.'
  );
  lines.push('');

  const planned = occupiedRooms(task.room_plan);
  const rooms =
    planned.length > 0
      ? planned
      : Array.isArray(task.rooms_to_prepare) && task.rooms_to_prepare.length > 0
      ? [...task.rooms_to_prepare].sort((a, b) => a - b)
      : Array.from({ length: villaRooms }, (_, i) => i + 1);

  lines.push('*O que é preciso:*');
  lines.push(`• Trocar lençóis: ${listRooms(rooms)}`);

  const guests = totalGuests(task.room_plan);
  const towels = task.towels_override ?? (guests > 0 ? guests : task.num_guests);
  lines.push(towels ? `• Toalhas lavadas: ${towels}` : '• Trocar as toalhas');
  lines.push(`• Limpar as ${BATHROOMS} casas de banho`);
  lines.push('');
  lines.push('O resto da casa fica como está.');

  const note = (task.owner_notes || '').trim();
  if (note) {
    lines.push('');
    lines.push(`📝 ${note}`);
  }

  lines.push('');
  lines.push('⏰ *A hora tem de ser combinada com os hóspedes.*');
  return lines.join('\n');
}
