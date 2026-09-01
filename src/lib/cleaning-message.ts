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

export const CHECKOUT_HOUR = '11h';
export const CHECKIN_HOUR = '16h';

export interface CleaningMessageTask {
  cleaning_date: string; // YYYY-MM-DD — the checkout day
  guest_name: string | null;
  rooms_to_prepare: number[] | null; // null/empty = every room
  owner_notes: string | null;
  num_guests: number | null;
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

/** [1, 2] → "Q1 e Q2" · [1, 2, 3] → "Q1, Q2 e Q3" */
function listRooms(rooms: number[]): string {
  const labels = rooms.map((n) => `Q${n}`);
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
  const explicit =
    Array.isArray(task.rooms_to_prepare) &&
    task.rooms_to_prepare.length > 0 &&
    task.rooms_to_prepare.length < villaRooms
      ? [...task.rooms_to_prepare].sort((a, b) => a - b)
      : null;

  if (explicit) {
    const rest = Array.from({ length: villaRooms }, (_, i) => i + 1).filter(
      (n) => !explicit.includes(n)
    );
    lines.push(`🛏 Preparar só: *${listRooms(explicit)}*`);
    lines.push(`${listRooms(rest)}: não mexer, fica só o cobertor (não é preciso lavar a roupa).`);
  } else {
    lines.push(`🛏 Preparar *todos os quartos* (${villaRooms}).`);
  }

  if (task.num_guests != null) {
    lines.push(`Hóspedes: ${task.num_guests}`);
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
