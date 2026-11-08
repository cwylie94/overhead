export const CATCH_READY_LEAD = 10 * 60_000;

export type CatchWindow = 'early' | 'ready' | 'live' | 'over';

export function catchWindow(pass: { startAt: number; endAt: number }, now: number): CatchWindow {
  if (now >= pass.endAt) {
    return 'over';
  }
  if (now >= pass.startAt) {
    return 'live';
  }
  return now >= pass.startAt - CATCH_READY_LEAD ? 'ready' : 'early';
}
