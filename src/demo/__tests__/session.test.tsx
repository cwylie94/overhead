import { act, renderHook } from '@testing-library/react-native';

import { deviceData, freshDemoData } from '@/data/client';
import { useSettingsStore } from '@/stores/settingsStore';

import { DEMO_LEAD, DEMO_OBSERVER, findDemoPass } from '../scenario';
import { useAppSession, useDemo } from '../session';
import { DEMO_PASS } from '../testing/demoMocks';

jest.mock('@/data/client', () => {
  let demoRuns = 0;
  return {
    deviceData: jest.fn(() => ({ key: 'device' })),
    freshDemoData: jest.fn(() => ({ key: `demo-${++demoRuns}` })),
  };
});

jest.mock('@/data/snapshot', () => ({ bundledSnapshot: {} }));

jest.mock('../scenario', () => ({
  ...jest.requireActual('../scenario'),
  findDemoPass: jest.fn(),
}));

const WALL_CLOCK = Date.UTC(2026, 10, 9, 12, 0);

async function setDemoMode(enabled: boolean) {
  await act(async () => useSettingsStore.getState().setDemoMode(enabled));
}

beforeEach(async () => {
  jest.useFakeTimers({ now: WALL_CLOCK });
  await setDemoMode(false);
  jest.clearAllMocks();
  jest.mocked(findDemoPass).mockReturnValue(DEMO_PASS);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('the app session', () => {
  test('stays on the device database when the snapshot has no demo pass', async () => {
    jest.mocked(findDemoPass).mockReturnValue(null);
    const { result } = await renderHook(() => useAppSession());

    await setDemoMode(true);

    expect(result.current).toEqual({ data: { key: 'device' }, demo: null });
    expect(freshDemoData).not.toHaveBeenCalled();
  });

  test('uses the device database outside demo mode', async () => {
    const { result } = await renderHook(() => useAppSession());

    expect(result.current.data).toEqual({ key: 'device' });
    expect(result.current.demo).toBeNull();
  });

  test('switches to a fresh demo database and London when demo mode turns on', async () => {
    const { result } = await renderHook(() => useAppSession());

    await setDemoMode(true);

    expect(result.current.data.key).toMatch(/^demo-/);
    expect(result.current.demo).toMatchObject({
      observer: DEMO_OBSERVER,
      pass: DEMO_PASS,
      startsAt: DEMO_PASS.startAt - DEMO_LEAD,
    });
  });

  test('runs the demo clock in real time from just before the demo pass', async () => {
    const { result } = await renderHook(() => useDemo());
    await setDemoMode(true);
    const clock = result.current!.clock;

    expect(clock.now()).toBe(DEMO_PASS.startAt - DEMO_LEAD);
    jest.advanceTimersByTime(90_000);
    expect(clock.now()).toBe(DEMO_PASS.startAt - DEMO_LEAD + 90_000);
  });

  test('starts every demo from a fresh database', async () => {
    const { result } = await renderHook(() => useAppSession());

    await setDemoMode(true);
    const first = result.current.data.key;
    await setDemoMode(false);
    await setDemoMode(true);

    expect(result.current.data.key).not.toBe(first);
    expect(freshDemoData).toHaveBeenCalledTimes(2);
  });

  test('goes back to the device database when demo mode turns off', async () => {
    const { result } = await renderHook(() => useAppSession());
    await setDemoMode(true);

    await setDemoMode(false);

    expect(result.current).toEqual({ data: { key: 'device' }, demo: null });
    expect(deviceData).toHaveBeenCalled();
  });

  test('keeps the same session when another setting changes', async () => {
    const { result } = await renderHook(() => useAppSession());
    const before = result.current;

    await act(async () => useSettingsStore.getState().setHapticsEnabled(false));

    expect(result.current).toBe(before);
  });
});
