import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';

export type Clock = {
  now(): number;
};

export const systemClock: Clock = { now: () => Date.now() };

const ClockContext = createContext<Clock>(systemClock);

type Ticker = {
  subscribe(listener: () => void): () => void;
  getSnapshot(): number;
};

const tickers = new Map<number, Ticker>();

function tickerFor(intervalMs: number): Ticker {
  const existing = tickers.get(intervalMs);
  if (existing) {
    return existing;
  }

  const listeners = new Set<() => void>();
  let tick = 0;
  let timer: ReturnType<typeof setInterval> | null = null;

  const ticker: Ticker = {
    subscribe(listener) {
      listeners.add(listener);
      if (timer === null) {
        timer = setInterval(() => {
          tick += 1;
          listeners.forEach((notify) => notify());
        }, intervalMs);
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && timer !== null) {
          clearInterval(timer);
          timer = null;
        }
      };
    },
    getSnapshot: () => tick,
  };
  tickers.set(intervalMs, ticker);
  return ticker;
}

type ClockProviderProps = {
  clock: Clock;
  children: ReactNode;
};

export function ClockProvider({ clock, children }: ClockProviderProps) {
  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>;
}

export function useClock(): Clock {
  return useContext(ClockContext);
}

export function useNow(intervalMs = 1_000): number {
  const clock = useClock();
  const ticker = tickerFor(intervalMs);
  useSyncExternalStore(ticker.subscribe, ticker.getSnapshot);
  return Math.floor(clock.now() / intervalMs) * intervalMs;
}
