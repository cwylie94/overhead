import { useSyncExternalStore } from 'react';

import { deviceData, freshDemoData, type AppData } from '@/data/client';
import { bundledSnapshot } from '@/data/snapshot';
import type { Observer } from '@/domain/observer';
import { systemClock, type Clock } from '@/environment/clock';
import { useSettingsStore } from '@/stores/settingsStore';

import { DEMO_OBSERVER, demoStartTime, findDemoPass, type DemoPass } from './scenario';

export type DemoEnvironment = {
  clock: Clock;
  observer: Observer;
  pass: DemoPass;
  startsAt: number;
};

export type AppSession = {
  data: AppData;
  demo: DemoEnvironment | null;
};

let demoPass: DemoPass | null | undefined;

function startDemo(): DemoEnvironment | null {
  demoPass ??= findDemoPass(bundledSnapshot);
  if (!demoPass) {
    return null;
  }
  const startsAt = demoStartTime(demoPass);
  const startedAt = systemClock.now();
  return {
    clock: { now: () => startsAt + (systemClock.now() - startedAt) },
    observer: DEMO_OBSERVER,
    pass: demoPass,
    startsAt,
  };
}

function createSession(demoMode: boolean): AppSession {
  const demo = demoMode ? startDemo() : null;
  return demo ? { data: freshDemoData(), demo } : { data: deviceData(), demo: null };
}

let session = createSession(useSettingsStore.getState().demoMode);
const listeners = new Set<() => void>();

useSettingsStore.subscribe((state, previous) => {
  if (state.demoMode !== previous.demoMode) {
    session = createSession(state.demoMode);
    listeners.forEach((listener) => listener());
  }
});

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppSession(): AppSession {
  return useSyncExternalStore(subscribe, () => session);
}

export function useDemo(): DemoEnvironment | null {
  return useAppSession().demo;
}
