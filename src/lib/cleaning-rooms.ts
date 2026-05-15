// Centralised rule for "which rooms must the cleaner prepare".
//
// By default the cleaner prepares every room. The host may set an
// explicit `rooms_to_prepare` override on a booking when they know
// fewer rooms are needed (e.g., 2 guests in a 3-bedroom villa) — only
// then does the cleaner page show a "só Q1" hint. No automatic
// inference from num_guests.

export interface EffectiveRooms {
  rooms: number[] | null; // null = prepare every room
  source: 'explicit' | 'all';
}

export function effectiveRoomsToPrepare(
  explicit: number[] | null | undefined,
  _numGuests: number | null | undefined,
  villaRooms: number
): EffectiveRooms {
  if (Array.isArray(explicit) && explicit.length > 0 && explicit.length < villaRooms) {
    return { rooms: [...explicit].sort(), source: 'explicit' };
  }
  return { rooms: null, source: 'all' };
}
