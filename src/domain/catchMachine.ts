export const CATCH_HOLD_MS = 2_000;
export const CATCH_TOLERANCE_DEGREES = 10;

export type CatchTarget = {
  noradId: number;
  passEndAt: number;
};

export type CatchState =
  | { status: 'idle' }
  | { status: 'aiming'; target: CatchTarget }
  | { status: 'locked'; target: CatchTarget; lockedAt: number }
  | { status: 'caught'; target: CatchTarget; caughtAt: number; angleError: number }
  | { status: 'failed'; target: CatchTarget };

export type CatchStatus = CatchState['status'];

export type CatchEvent =
  | { type: 'start'; target: CatchTarget; at: number }
  | { type: 'aim'; angleError: number; at: number }
  | { type: 'passEnded' }
  | { type: 'reset' };

export const IDLE: CatchState = { status: 'idle' };

export function isOnTarget(angleError: number): boolean {
  return angleError <= CATCH_TOLERANCE_DEGREES;
}

export function holdProgress(state: CatchState, now: number): number {
  if (state.status === 'caught') {
    return 1;
  }
  if (state.status !== 'locked') {
    return 0;
  }
  return Math.min(1, Math.max(0, (now - state.lockedAt) / CATCH_HOLD_MS));
}

export function transition(state: CatchState, event: CatchEvent): CatchState {
  if (event.type === 'reset') {
    return state.status === 'idle' ? state : IDLE;
  }

  switch (state.status) {
    case 'idle':
      if (event.type === 'start' && event.at < event.target.passEndAt) {
        return { status: 'aiming', target: event.target };
      }
      return state;

    case 'aiming':
      if (event.type === 'passEnded') {
        return { status: 'failed', target: state.target };
      }
      if (event.type === 'aim') {
        if (event.at >= state.target.passEndAt) {
          return { status: 'failed', target: state.target };
        }
        if (isOnTarget(event.angleError)) {
          return { status: 'locked', target: state.target, lockedAt: event.at };
        }
      }
      return state;

    case 'locked':
      if (event.type === 'passEnded') {
        return { status: 'failed', target: state.target };
      }
      if (event.type === 'aim') {
        if (event.at >= state.target.passEndAt) {
          return { status: 'failed', target: state.target };
        }
        if (!isOnTarget(event.angleError)) {
          return { status: 'aiming', target: state.target };
        }
        if (event.at - state.lockedAt >= CATCH_HOLD_MS) {
          return {
            status: 'caught',
            target: state.target,
            caughtAt: event.at,
            angleError: event.angleError,
          };
        }
      }
      return state;

    case 'caught':
    case 'failed':
      return state;
  }
}
