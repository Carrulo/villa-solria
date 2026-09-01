// The actual layout of the villa. The cleaner decides which linen to
// carry from this, so the bed description matters as much as the room
// name — "2 camas individuais" is two single sets, "queen" is one big
// one. Edit here if the house ever changes.

export interface RoomProfile {
  n: number;
  /** Short name the host and cleaner both use. */
  name: string;
  floor: string;
  beds: string;
  /** What a single bed in here is called, for per-person instructions. */
  bedLabel: string;
  /** How many separate beds — the twin room is the reason this exists. */
  bedCount: number;
  /** Adults/children it sleeps, excluding the cot. */
  sleeps: number;
}

export const ROOM_PROFILES: RoomProfile[] = [
  {
    n: 1,
    name: 'Principal',
    floor: '1º andar',
    beds: 'cama queen + berço',
    bedLabel: 'cama queen',
    bedCount: 1,
    sleeps: 2,
  },
  {
    n: 2,
    name: 'Casal',
    floor: '1º andar',
    beds: 'cama de casal 1,40 m',
    bedLabel: 'cama de casal 1,40 m',
    bedCount: 1,
    sleeps: 2,
  },
  {
    n: 3,
    name: 'Duplo',
    floor: 'rés-do-chão',
    beds: '2 camas individuais',
    bedLabel: 'cama individual',
    bedCount: 2,
    sleeps: 2,
  },
];

/** Two bathrooms, and they are the bulk of a mid-stay intervention. */
export const BATHROOMS = 2;

/** Max occupancy: 6 people plus a baby in the cot. */
export const MAX_GUESTS = ROOM_PROFILES.reduce((sum, r) => sum + r.sleeps, 0);
export const HAS_COT = true;

export function roomProfile(n: number): RoomProfile {
  return (
    ROOM_PROFILES.find((r) => r.n === n) || {
      n,
      name: `Quarto ${n}`,
      floor: '',
      beds: '',
      bedLabel: 'cama',
      bedCount: 1,
      sleeps: 2,
    }
  );
}

/** "Q1 Principal (1º andar) — cama de casal + berço" */
export function describeRoom(n: number): string {
  const r = roomProfile(n);
  const place = r.floor ? ` (${r.floor})` : '';
  const beds = r.beds ? ` — ${r.beds}` : '';
  return `Q${r.n} ${r.name}${place}${beds}`;
}

/** "Q1 Principal" — for tight spots like buttons and summaries. */
export function shortRoom(n: number): string {
  const r = roomProfile(n);
  return `Q${r.n} ${r.name}`;
}
