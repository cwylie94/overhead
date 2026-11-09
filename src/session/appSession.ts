import { useSyncExternalStore } from 'react';

import { deviceData, freshDemoData, type AppData } from '@/data/client';
import { bundledSnapshot } from '@/data/snapshot';
import { DEMO_OBSERVER, demoStartTime, findDemoPass, type DemoPass } from '@/demo/scenario';
import type { Observer } from '@/domain/observer';
import { systemClock, type Clock } from '@/environment/clock';
import { useSettingsStore } from '@/stores/settingsStore';

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

let session: AppSession | null = null;
let sessionDemoMode: boolean | null = null;

function currentSession(): AppSession {
  const { demoMode } = useSettingsStore.getState();
  if (!session || demoMode !== sessionDemoMode) {
    session = createSession(demoMode);
    sessionDemoMode = demoMode;
  }
  return session;
}

function subscribe(listener: () => void): () => void {
  return useSettingsStore.subscribe((state, previous) => {
    if (state.demoMode !== previous.demoMode) {
      listener();
    }
  });
}

export function useAppSession(): AppSession {
  return useSyncExternalStore(subscribe, currentSession);
}

export function useDemo(): DemoEnvironment | null {
  return useAppSession().demo;
}
