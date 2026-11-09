import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UpcomingPass } from '@/data/queries';
import { ClockProvider } from '@/environment/clock';

import { nightNoon, nightOf } from '../nights';
import { nightSky } from '../nightSky';
import { staleDaysFor } from '../staleness';
import { fractionOf, timelineRange } from '../timelineLayout';
import { TonightView, type TonightViewProps } from '../TonightView';

jest.mock('../SkyGlyph', () => ({ SkyGlyph: () => null }));
jest.mock('../TimelineScrubber', () => ({
  TimelineScrubber: ({ children }: { children: React.ReactNode }) => children,
}));

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
  stale: false,
  passes: [makePass()],
  now: NOW,
  offline: false,
  staleDays: null,
  demoStartsAt: null,
  chosenLocation: null,
  reminders: null,
  refreshing: false,
  onRefresh: () => {},
  onAllowLocation: () => {},
  onChooseCity: () => {},
  onCatch: () => {},
  onOpenSatellite: () => {},
};

const faintLow = (overrides: Partial<UpcomingPass> = {}) =>
  makePass({
    id: 7,
    noradId: 40000,
    name: 'COSMOS 1867',
    startAt: NOW + 90 * MINUTE,
    peakMagnitude: 4,
    maxElevation: 18,
    ...overrides,
  });

async function renderView(props: Partial<TonightViewProps> = {}) {
  await render(
    <ClockProvider clock={{ now: () => NOW }}>
      <TonightView {...defaults} {...props} />
    </ClockProvider>,
  );
}

describe('TonightView', () => {
  test('features the best pass of the night with its countdown, path, brightness and rarity', async () => {
    await renderView();

    expect(screen.getByText('Best tonight')).toBeOnTheScreen();
    expect(screen.getByText('SL-16 R/B')).toBeOnTheScreen();
    expect(screen.getByText('in 12 minutes')).toBeOnTheScreen();
    expect(screen.getByText(/SW → NE · 55° · 4 min/)).toBeOnTheScreen();
    expect(screen.getByText('Bright')).toBeOnTheScreen();
    expect(screen.getByText('Uncommon')).toBeOnTheScreen();
  });

  test('sums up the night next to the title', async () => {
    await renderView({ passes: [makePass(), faintLow()] });

    expect(screen.getByRole('header', { name: 'Tonight' })).toBeOnTheScreen();
    expect(screen.getByText('2 passes · 1 bright')).toBeOnTheScreen();
  });

  test('lists the other passes in compact rows', async () => {
    await renderView({
      passes: [makePass(), makePass({ id: 2, name: 'HST', startAt: NOW + 3 * 60 * MINUTE })],
    });

    expect(screen.getByRole('button', { name: /^HST, / })).toBeOnTheScreen();
    expect(screen.getAllByText('SL-16 R/B')).toHaveLength(1);
  });

  test('opens the satellite from a row or the featured card', async () => {
    const onOpenSatellite = jest.fn();
    await renderView({
      passes: [makePass(), makePass({ id: 2, name: 'HST', startAt: NOW + 3 * 60 * MINUTE })],
      onOpenSatellite,
    });

    await fireEvent.press(screen.getByRole('button', { name: /^HST, / }));
    await fireEvent.press(screen.getByRole('button', { name: 'Details for SL-16 R/B' }));

    expect(onOpenSatellite.mock.calls.map(([pass]) => pass.name)).toEqual(['HST', 'SL-16 R/B']);
  });

  test('hides faint low passes until asked to show them all', async () => {
    await renderView({ passes: [makePass(), faintLow()] });

    expect(screen.queryByText('COSMOS 1867')).toBeNull();
    expect(screen.getByText('1 more pass hidden')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: /Show all/ }));

    expect(screen.getByText('COSMOS 1867')).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
  });

  test('can show only rare passes', async () => {
    await renderView({
      passes: [
        makePass(),
        makePass({ id: 2, name: 'HST', startAt: NOW + 60 * MINUTE }),
        makePass({ id: 3, name: 'Lacrosse 5', rarity: 'rare', startAt: NOW + 2 * 60 * MINUTE }),
      ],
    });

    await fireEvent.press(screen.getByRole('radio', { name: 'Rare' }));

    expect(screen.getByText('Lacrosse 5')).toBeOnTheScreen();
    expect(screen.queryByText('HST')).toBeNull();
  });

  test('says so when the filter hides every other pass', async () => {
    await renderView({ passes: [makePass(), faintLow()] });

    await fireEvent.press(screen.getByRole('radio', { name: 'Rare' }));

    expect(screen.getByText('Nothing matches this filter.')).toBeOnTheScreen();
  });

  test('features a pass about to start over a better one later', async () => {
    await renderView({
      passes: [
        makePass({ id: 1, name: 'HST', startAt: NOW + 5 * MINUTE, peakMagnitude: 3 }),
        makePass({ id: 2, name: 'ISS', startAt: NOW + 60 * MINUTE, peakMagnitude: -3 }),
      ],
    });

    expect(screen.getByText('Coming up')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Details for HST' })).toBeOnTheScreen();
  });

  test('draws the night on a timeline', async () => {
    await renderView({ passes: [makePass(), faintLow()] });

    expect(screen.getByLabelText(/^Night from .* to .*: 2 passes, 1 bright$/)).toBeOnTheScreen();
  });

  test('tapping a hidden pass on the timeline shows all passes', async () => {
    const passes = [makePass(), faintLow()];
    await renderView({ passes });
    const timeline = screen.getByLabelText(/^Night from/);
    const sky = nightSky(
      defaults.location.status === 'ready'
        ? defaults.location.observer
        : { latitude: 0, longitude: 0, altitude: 0 },
      nightNoon(nightOf(NOW)),
    );
    const range = timelineRange(sky, passes)!;
    const width = 300;

    await fireEvent(timeline, 'layout', { nativeEvent: { layout: { width, height: 30 } } });
    await fireEvent.press(timeline, {
      nativeEvent: { locationX: fractionOf(passes[1]!.startAt + MINUTE, range) * width },
    });

    expect(screen.getByText('COSMOS 1867')).toBeOnTheScreen();
  });

  test('steps through the passes on the timeline with VoiceOver', async () => {
    const passes = [makePass(), faintLow()];
    await renderView({ passes });
    const timeline = screen.getByLabelText(/^Night from/);

    await fireEvent(timeline, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    await fireEvent(timeline, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });

    expect(timeline).toHaveAccessibilityValue({ text: /^COSMOS 1867, / });
    expect(screen.getByText('COSMOS 1867')).toBeOnTheScreen();
  });

  test('marks a pass that is already under way as visible now and offers to catch it', async () => {
    const onCatch = jest.fn();
    await renderView({ passes: [makePass({ startAt: NOW - MINUTE })], onCatch });

    expect(screen.getAllByText('Visible now').length).toBeGreaterThan(0);
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

  test('lists later nights under their own heading, counting only tonight', async () => {
    const tomorrow = new Date(2026, 10, 9, 21, 0).getTime();

    await renderView({
      passes: [
        makePass({ id: 1 }),
        makePass({ id: 2, startAt: NOW + 3 * 60 * MINUTE }),
        makePass({ id: 3, startAt: tomorrow }),
      ],
    });

    expect(screen.getByText('2 passes · 2 bright')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Tonight' })).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Tomorrow night' })).toBeOnTheScreen();
  });

  test('says so when there are no visible passes', async () => {
    await renderView({ passes: [] });

    expect(screen.getByText('No visible passes in the next two nights.')).toBeOnTheScreen();
    expect(screen.queryByText(/^\d+ passes?/)).toBeNull();
  });

  test('shows progress instead of the old list while passes for a new place are worked out', async () => {
    await renderView({ computing: true, stale: true });

    expect(screen.getByText('Working out the passes over you…')).toBeOnTheScreen();
    expect(screen.queryByText('SL-16 R/B')).toBeNull();
  });

  test('keeps the list while refreshing the same place', async () => {
    await renderView({ computing: true, stale: false });

    expect(screen.getByText('SL-16 R/B')).toBeOnTheScreen();
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

  test('names the chosen city under the title and lets the user change it', async () => {
    const onChooseCity = jest.fn();
    await renderView({ chosenLocation: { name: 'Reykjavík', country: 'Iceland' }, onChooseCity });

    await fireEvent.press(screen.getByText('Reykjavík, Iceland'));

    expect(onChooseCity).toHaveBeenCalled();
  });

  test('says it is using the phone’s location when no city is chosen', async () => {
    await renderView();

    expect(screen.getByText('Your location')).toBeOnTheScreen();
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

  test('offers a city instead when location is refused', async () => {
    const onChooseCity = jest.fn();
    await renderView({ location: { status: 'denied', canAskAgain: false }, onChooseCity });

    await fireEvent.press(screen.getByRole('button', { name: 'Choose a city instead' }));

    expect(onChooseCity).toHaveBeenCalled();
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

  test('offers a reminder bell on each row', async () => {
    const toggle = jest.fn();
    await renderView({
      passes: [makePass(), makePass({ id: 2, name: 'HST', startAt: NOW + 3 * 60 * MINUTE })],
      reminders: { isSet: (pass) => pass.id === 2, toggle },
    });

    const switches = screen.getAllByRole('switch', { name: 'Remind me' });
    expect(switches).toHaveLength(2);
    expect(switches[1]).toBeChecked();

    fireEvent.press(switches[1]!);
    expect(toggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'HST' }));
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
