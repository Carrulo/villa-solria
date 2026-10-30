// When a guest may review the stay on the site, through the private link
// of their booking. Opens on the last night — some write before leaving —
// and closes six months after checkout. Shared by the page and the API.

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function reviewWindow(checkoutDate: string, today: string): 'before' | 'open' | 'closed' {
  if (today < addDays(checkoutDate, -1)) return 'before';
  if (today > addDays(checkoutDate, 180)) return 'closed';
  return 'open';
}
