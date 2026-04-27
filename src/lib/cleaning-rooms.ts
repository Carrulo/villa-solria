// Centralised rule for "which rooms must the cleaner prepare" so the
// behaviour is identical across the cleaner UI and the admin override
// modal.
//
// Priority:
//   1. explicit `rooms_to_prepare` set by the host on the cleaning task
//   2. otherwise, infer from `num_guests` so a 2-person stay does not
//      get full bedmaking on every room by default
//   3. otherwise, prepare every room (null sentinel)

export interface EffectiveRooms {
  rooms: number[] | null; // null = prepare every room
  source: 'explicit' | 'inferred' | 'all';
}

export function inferRoomsByGuests(
  numGuests: number | null | undefined,
  villaRooms: number
): number[] | null {
  if (numGuests == null || numGuests <= 0) return null;
  if (numGuests <= 2) return [1];
  if (numGuests <= 4) return [1, 2];
  // 5+ guests → use all rooms (return null so callers can short-circuit
  // their "user-overrode the default" badge).
  return null;
}

export function effectiveRoomsToPrepare(
  explicit: number[] | null | undefined,
  numGuests: number | null | undefined,
  villaRooms: number
): EffectiveRooms {
  if (Array.isArray(explicit) && explicit.length > 0 && explicit.length < villaRooms) {
    return { rooms: [...explicit].sort(), source: 'explicit' };
  }
  const inferred = inferRoomsByGuests(numGuests, villaRooms);
  if (inferred && inferred.length > 0 && inferred.length < villaRooms) {
    return { rooms: inferred, source: 'inferred' };
  }
  return { rooms: null, source: 'all' };
}
