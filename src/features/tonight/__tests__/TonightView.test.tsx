import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UpcomingPass } from '@/data/queries';
import { ClockProvider } from '@/environment/clock';

import { staleDaysFor } from '../staleness';
import { TonightView, type TonightViewProps } from '../TonightView';

const NOW = new Date(2026, 10, 8, 20, 0).getTime();
const MINUTE = 60_000;

function makePass(overrides: Partial<UpcomingPass> = {}): UpcomingPass {
  const startAt = overrides.startAt ?? NOW + 12 * MINUTE;
  return {
    id: 1,
    noradId: 22566,
    startAt,
    peakAt: startAt + 2 * MINUTE,
    endAt: startAt + 4 * MINUTE,
    maxElevation: 55.4,
    peakMagnitude: 2.1,
    track: [
      { time: startAt - MINUTE, azimuth: 225, elevation: 5 },
      { time: startAt + 2 * MINUTE, azimuth: 315, elevation: 55 },
      { time: startAt + 5 * MINUTE, azimuth: 45, elevation: 5 },
    ],
    name: 'SL-16 R/B',
    rarity: 'uncommon',
    ...overrides,
  };
}

const defaults: TonightViewProps = {
  location: { status: 'ready', observer: { latitude: 51.51, longitude: -0.13, altitude: 0 } },
  computing: false,
  passes: [makePass()],
  now: NOW,
  offline: false,
  staleDays: null,
  demoStartsAt: null,
  testLocation: null,
  reminders: null,
  refreshing: false,
  onRefresh: () => {},
  onAllowLocation: () => {},
  onCatch: () => {},
};

async function renderView(props: Partial<TonightViewProps> = {}) {
  await render(
    <ClockProvider clock={{ now: () => NOW }}>
      <TonightView {...defaults} {...props} />
    </ClockProvider>,
  );
}

describe('TonightView', () => {
  test('lists live passes with their countdown, path, elevation, brightness and rarity', async () => {
    await renderView();

    expect(screen.getByText('1 pass tonight')).toBeOnTheScreen();
    expect(screen.getByText('SL-16 R/B')).toBeOnTheScreen();
    expect(screen.getByText('in 12 minutes')).toBeOnTheScreen();
    expect(screen.getByText(/Appears SW, disappears NE · Max 55°/)).toBeOnTheScreen();
    expect(screen.getByText('Bright')).toBeOnTheScreen();
    expect(screen.getByText('Uncommon')).toBeOnTheScreen();
  });

  test('marks a pass that is already under way as visible now and offers to catch it', async () => {
    const onCatch = jest.fn();
    await renderView({ passes: [makePass({ startAt: NOW - MINUTE })], onCatch });

    expect(screen.getByText('Visible now')).toBeOnTheScreen();
    fireEvent.press(screen.getByRole('button', { name: 'Catch' }));
    expect(onCatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'SL-16 R/B' }));
  });

  test('offers to get ready in the ten minutes before a pass', async () => {
    const onCatch = jest.fn();
    await renderView({ passes: [makePass({ startAt: NOW + 8 * MINUTE })], onCatch });

    await fireEvent.press(screen.getByRole('button', { name: 'Get ready' }));
    expect(onCatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'SL-16 R/B' }));
    expect(screen.queryByRole('button', { name: 'Catch' })).toBeNull();
  });

  test('offers no catch well before the pass', async () => {
    await renderView();

    expect(screen.queryByRole('button', { name: 'Catch' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Get ready' })).toBeNull();
  });

  test('says a pass has just ended rather than counting back from its start', async () => {
    await renderView({ passes: [makePass({ startAt: NOW - 5 * MINUTE })] });

    expect(screen.getByText('Just ended')).toBeOnTheScreen();
    expect(screen.queryByText(/ago/)).toBeNull();
  });

  test('groups passes into tonight and tomorrow night, counting only tonight', async () => {
    const tomorrow = new Date(2026, 10, 9, 21, 0).getTime();

    await renderView({
      passes: [
        makePass({ id: 1 }),
        makePass({ id: 2, startAt: NOW + 3 * 60 * MINUTE }),
        makePass({ id: 3, startAt: tomorrow }),
      ],
    });

    expect(screen.getByText('2 passes tonight')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Tonight' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Tomorrow night' })).toBeOnTheScreen();
  });

  test('says so when there are no visible passes', async () => {
    await renderView({ passes: [] });

    expect(screen.getByText('No visible passes in the next two nights.')).toBeOnTheScreen();
    expect(screen.queryByText(/passes tonight/)).toBeNull();
  });

  test('shows progress instead of an empty list while passes are being worked out', async () => {
    await renderView({ passes: [], computing: true });

    expect(screen.getByText('Working out the passes over you…')).toBeOnTheScreen();
  });

  test('says when it is showing the demo evening', async () => {
    await renderView({ demoStartsAt: NOW });

    expect(
      screen.getByText('Demo mode: Sunday, November 8 in London. Turn it off in Settings.'),
    ).toBeOnTheScreen();
  });

  test('warns when a test location stands in for GPS', async () => {
    await renderView({ testLocation: { latitude: 64.15, longitude: -21.94, altitude: 0 } });

    expect(screen.getByText(/Test location 64.15, -21.94/)).toBeOnTheScreen();
  });

  test('shows the offline banner and keeps listing passes', async () => {
    await renderView({ offline: true });

    expect(screen.getByText(/You’re offline/)).toBeOnTheScreen();
    expect(screen.getByText('SL-16 R/B')).toBeOnTheScreen();
  });

  test('warns when the orbit data is stale', async () => {
    await renderView({ staleDays: 4 });

    expect(
      screen.getByText('Orbit data is 4 days old, so predictions may be off by a few minutes.'),
    ).toBeOnTheScreen();
  });

  test('asks for location when it has been refused', async () => {
    const onAllowLocation = jest.fn();
    await renderView({ location: { status: 'denied', canAskAgain: true }, onAllowLocation });

    fireEvent.press(screen.getByRole('button', { name: 'Allow location' }));

    expect(onAllowLocation).toHaveBeenCalled();
  });

  test('sends the user to Settings when the system will not ask again', async () => {
    await renderView({ location: { status: 'denied', canAskAgain: false } });

    expect(screen.getByRole('button', { name: 'Open Settings' })).toBeOnTheScreen();
  });

  test('toggles a reminder for a pass far enough away', async () => {
    const toggle = jest.fn();
    await renderView({ reminders: { isSet: () => false, toggle } });

    fireEvent.press(screen.getByRole('switch', { name: 'Remind me' }));

    expect(toggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'SL-16 R/B' }));
  });

  test('shows a reminder that is already set', async () => {
    await renderView({ reminders: { isSet: () => true, toggle: () => {} } });

    expect(screen.getByRole('switch', { name: 'Remind me' })).toBeChecked();
    expect(screen.getByText('Reminder set')).toBeOnTheScreen();
  });

  test('offers no reminder for a pass that starts too soon', async () => {
    await renderView({
      passes: [makePass({ startAt: NOW + 2 * MINUTE })],
      reminders: { isSet: () => false, toggle: () => {} },
    });

    expect(screen.queryByRole('switch')).toBeNull();
  });

  test('offers no reminders when notifications are off in Settings', async () => {
    await renderView({ reminders: null });

    expect(screen.queryByRole('switch')).toBeNull();
  });

  test('waits for a location before listing anything', async () => {
    await renderView({ location: { status: 'locating' } });

    expect(screen.getByText('Finding your location…')).toBeOnTheScreen();
  });
});

describe('staleDaysFor', () => {
  const DAY = 24 * 60 * MINUTE;

  test.each([
    [[NOW - 2 * DAY], null],
    [[NOW - 3 * DAY], 3],
    [[NOW - 1 * DAY, NOW - 5 * DAY], 5],
    [[], null],
    [[null], null],
  ])('orbit groups fetched at %j are stale by %s days', (fetchedAt, expected) => {
    expect(staleDaysFor(fetchedAt, NOW)).toBe(expected);
  });
});
