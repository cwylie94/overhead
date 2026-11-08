export type Coalesced = { trigger(): void; cancel(): void };

export function coalesce(run: () => void, settleMs: number, maxWaitMs: number): Coalesced {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firstTriggerAt: number | null = null;

  const fire = () => {
    timer = null;
    firstTriggerAt = null;
    run();
  };

  return {
    trigger() {
      const now = Date.now();
      firstTriggerAt ??= now;
      if (timer !== null) {
        clearTimeout(timer);
      }
      const waited = now - firstTriggerAt;
      timer = setTimeout(fire, Math.max(0, Math.min(settleMs, maxWaitMs - waited)));
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
      }
      timer = null;
      firstTriggerAt = null;
    },
  };
}
