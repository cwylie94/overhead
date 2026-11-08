const DAY = 24 * 60 * 60 * 1_000;
export const STALE_AFTER_DAYS = 3;

export function staleDaysFor(fetchedAt: (number | null)[], now: number): number | null {
  const known = fetchedAt.filter((time): time is number => time !== null);
  if (known.length === 0) {
    return null;
  }
  const days = Math.floor((now - Math.min(...known)) / DAY);
  return days >= STALE_AFTER_DAYS ? days : null;
}
