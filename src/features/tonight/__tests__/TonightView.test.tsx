import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UpcomingPass } from '@/data/queries';
import { nightNoon, nightOf } from '@/domain/nights';
import { ClockProvider } from '@/environment/clock';

import { nightSky } from '../nightSky';
import { staleDaysFor } from '../staleness';
import { timelineAxis, timelineRange, xOfTime } from '../timelineLayout';
import { TonightView, type TonightViewProps } from '../TonightView';

jest.mock('../SkyGlyph', () => ({ SkyGlyph: () => null }));
jest.mock('../LookDial', () => ({ LookDial: () => null }));
jest.mock('../TimelineScrubber', () => ({
  TimelineScrubber: ({ children }: { children: React.ReactNode }) => children,
}));

const NOW = new Date(2026, 10, 8, 20, 0).getTime();
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const TIMELINE_WIDTH = 300;

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

const HST_LATER = makePass({ id: 2, name: 'HST', startAt: NOW + 3 * 60 * MINUTE });

async function renderView(props: Partial<TonightViewProps> = {}, clockNow = NOW) {
  await render(
    <ClockProvider clock={{ now: () => clockNow }}>
      <TonightView {...defaults} {...props} />
    </ClockProvider>,
  );
}

let scene: { props: Partial<TonightViewProps>; clockNow?: number };

async function openTheScreen() {
  await renderView(scene.props, scene.clockNow);
}

function timelineXOf(passes: UpcomingPass[], time: number) {
  const sky = nightSky(
    defaults.location.status === 'ready'
      ? defaults.location.observer
      : { latitude: 0, longitude: 0, altitude: 0 },
    nightNoon(nightOf(NOW)),
  );
  const range = timelineRange(sky, passes)!;
  return xOfTime(time, timelineAxis(range, passes), TIMELINE_WIDTH);
}

describe('TonightView', () => {
  describe('given the best pass of the night is 12 minutes away', () => {
    beforeEach(() => {
      scene = { props: { passes: [makePass()] } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it features the pass as the best tonight', () => {
        expect(screen.getByText('Best tonight')).toBeOnTheScreen();
        expect(screen.getByText('SL-16 R/B')).toBeOnTheScreen();
      });

      test('then it says where the pass appears and where it heads', () => {
        expect(screen.getByText('Appears in the southwest')).toBeOnTheScreen();
        expect(screen.getByText('Low in the sky, heading northeast')).toBeOnTheScreen();
      });

      test('then it counts down to the pass', () => {
        expect(screen.getByText(/· in 12 minutes$/)).toBeOnTheScreen();
      });

      test('then it shows how bright and how rare the pass is', () => {
        expect(screen.getByText('Bright')).toBeOnTheScreen();
        expect(screen.getByText('Uncommon')).toBeOnTheScreen();
      });

      test('then it offers no catch yet', () => {
        expect(screen.queryByRole('button', { name: 'Catch' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'Get ready' })).toBeNull();
      });
    });
  });

  describe('given a bright pass and a faint low one', () => {
    beforeEach(() => {
      scene = { props: { passes: [makePass(), faintLow()] } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it shows the Tonight title', () => {
        expect(screen.getByRole('header', { name: 'Tonight' })).toBeOnTheScreen();
      });

      test('then it sums up the night next to the title', () => {
        expect(screen.getByText('2 passes · 1 bright')).toBeOnTheScreen();
      });

      test('then it hides the faint low pass', () => {
        expect(screen.queryByText('COSMOS 1867')).toBeNull();
      });

      test('then it says how many passes are hidden', () => {
        expect(screen.getByText('1 more pass hidden')).toBeOnTheScreen();
      });

      test('then it draws the night on a timeline', () => {
        expect(
          screen.getByLabelText(/^Night from .* to .*: 2 passes, 1 bright$/),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen opened on a bright pass and a faint low one', () => {
    beforeEach(async () => {
      await renderView({ passes: [makePass(), faintLow()] });
    });

    describe('when the user presses Show all', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: /Show all/ }));
      });

      test('then it lists the faint low pass', () => {
        expect(screen.getByText('COSMOS 1867')).toBeOnTheScreen();
      });

      test('then the All filter is chosen', () => {
        expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
      });
    });

    describe('when the user picks the Rare filter', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('radio', { name: 'Rare' }));
      });

      test('then it says nothing matches the filter', () => {
        expect(screen.getByText('Nothing matches this filter.')).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen opened on a bright pass and a hidden faint one, with the timeline laid out', () => {
    const passes = [makePass(), faintLow()];

    beforeEach(async () => {
      await renderView({ passes });
      await fireEvent(screen.getByLabelText(/^Night from/), 'layout', {
        nativeEvent: { layout: { width: TIMELINE_WIDTH, height: 30 } },
      });
    });

    describe('when the user taps the hidden pass on the timeline', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByLabelText(/^Night from/), {
          nativeEvent: { locationX: timelineXOf(passes, passes[1]!.startAt + MINUTE) },
        });
      });

      test('then it shows all passes', () => {
        expect(screen.getByText('COSMOS 1867')).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen opened on a bright pass and a hidden faint one, with VoiceOver on the first pass of the timeline', () => {
    beforeEach(async () => {
      await renderView({ passes: [makePass(), faintLow()] });
      await fireEvent(screen.getByLabelText(/^Night from/), 'accessibilityAction', {
        nativeEvent: { actionName: 'increment' },
      });
    });

    describe('when the user steps to the next pass with VoiceOver', () => {
      beforeEach(async () => {
        await fireEvent(screen.getByLabelText(/^Night from/), 'accessibilityAction', {
          nativeEvent: { actionName: 'increment' },
        });
      });

      test('then the timeline reads out the faint pass', () => {
        expect(screen.getByLabelText(/^Night from/)).toHaveAccessibilityValue({
          text: /^COSMOS 1867, /,
        });
      });

      test('then it shows the faint pass', () => {
        expect(screen.getByText('COSMOS 1867')).toBeOnTheScreen();
      });
    });
  });

  describe('given the featured pass and HST later in the night', () => {
    beforeEach(() => {
      scene = { props: { passes: [makePass(), HST_LATER] } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it lists HST in a compact row', () => {
        expect(screen.getByRole('button', { name: /^HST, / })).toBeOnTheScreen();
      });

      test('then it shows the featured pass only once', () => {
        expect(screen.getAllByText('SL-16 R/B')).toHaveLength(1);
      });
    });
  });

  describe('given the screen opened on the featured pass and HST later in the night', () => {
    let onOpenSatellite: jest.Mock;

    beforeEach(async () => {
      onOpenSatellite = jest.fn();
      await renderView({ passes: [makePass(), HST_LATER], onOpenSatellite });
    });

    describe('when the user presses the HST row', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: /^HST, / }));
      });

      test('then it opens HST', () => {
        expect(onOpenSatellite.mock.calls.map(([pass]) => pass.name)).toEqual(['HST']);
      });
    });

    describe('when the user presses the featured card’s details', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Details for SL-16 R/B' }));
      });

      test('then it opens the featured satellite', () => {
        expect(onOpenSatellite.mock.calls.map(([pass]) => pass.name)).toEqual(['SL-16 R/B']);
      });
    });
  });

  describe('given the screen opened on a common pass, HST and the rare Lacrosse 5', () => {
    beforeEach(async () => {
      await renderView({
        passes: [
          makePass(),
          makePass({ id: 2, name: 'HST', startAt: NOW + 60 * MINUTE }),
          makePass({ id: 3, name: 'Lacrosse 5', rarity: 'rare', startAt: NOW + 2 * 60 * MINUTE }),
        ],
      });
    });

    describe('when the user picks the Rare filter', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('radio', { name: 'Rare' }));
      });

      test('then it lists the rare pass', () => {
        expect(screen.getByText('Lacrosse 5')).toBeOnTheScreen();
      });

      test('then it hides the pass that is not rare', () => {
        expect(screen.queryByText('HST')).toBeNull();
      });
    });
  });

  describe('given HST in 5 minutes and a brighter ISS pass in an hour', () => {
    beforeEach(() => {
      scene = {
        props: {
          passes: [
            makePass({ id: 1, name: 'HST', startAt: NOW + 5 * MINUTE, peakMagnitude: 3 }),
            makePass({ id: 2, name: 'ISS', startAt: NOW + 60 * MINUTE, peakMagnitude: -3 }),
          ],
        },
      };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it says a pass is coming up', () => {
        expect(screen.getByText('Coming up')).toBeOnTheScreen();
      });

      test('then it features the pass about to start', () => {
        expect(screen.getByRole('button', { name: 'Details for HST' })).toBeOnTheScreen();
      });
    });
  });

  describe('given a pass that is already under way', () => {
    beforeEach(() => {
      scene = { props: { passes: [makePass({ startAt: NOW - MINUTE })] } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it marks the pass as visible now', () => {
        expect(screen.getAllByText('Visible now').length).toBeGreaterThan(0);
      });
    });
  });

  describe('given the screen opened on a pass that is already under way', () => {
    let onCatch: jest.Mock;

    beforeEach(async () => {
      onCatch = jest.fn();
      await renderView({ passes: [makePass({ startAt: NOW - MINUTE })], onCatch });
    });

    describe('when the user presses Catch', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Catch' }));
      });

      test('then it opens catch mode for the pass', () => {
        expect(onCatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'SL-16 R/B' }));
      });
    });
  });

  describe('given the screen opened on a pass 8 minutes away', () => {
    let onCatch: jest.Mock;

    beforeEach(async () => {
      onCatch = jest.fn();
      await renderView({ passes: [makePass({ startAt: NOW + 8 * MINUTE })], onCatch });
    });

    describe('when the user presses Get ready', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Get ready' }));
      });

      test('then it opens catch mode for the pass', () => {
        expect(onCatch).toHaveBeenCalledWith(expect.objectContaining({ name: 'SL-16 R/B' }));
      });

      test('then it does not offer Catch yet', () => {
        expect(screen.queryByRole('button', { name: 'Catch' })).toBeNull();
      });
    });
  });

  describe('given a pass that started 5 minutes ago and has ended', () => {
    beforeEach(() => {
      scene = { props: { passes: [makePass({ startAt: NOW - 5 * MINUTE })] } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it says the pass has just ended', () => {
        expect(screen.getByText('Just ended')).toBeOnTheScreen();
      });

      test('then it does not count back from the start', () => {
        expect(screen.queryByText(/ago/)).toBeNull();
      });
    });
  });

  describe('given the featured pass started 10 seconds ago by the clock', () => {
    beforeEach(() => {
      const pass = makePass({ startAt: NOW + 2 * MINUTE });
      scene = { props: { passes: [pass] }, clockNow: pass.startAt + 10_000 };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it no longer says the pass is coming up', () => {
        expect(screen.queryByText('Coming up')).toBeNull();
      });

      test('then it calls the pass visible now', () => {
        expect(screen.getByText('Visible now')).toBeOnTheScreen();
      });

      test('then it says where to look', () => {
        expect(screen.getByText(/^Look /)).toBeOnTheScreen();
      });

      test('then it counts down to the end of the pass', () => {
        expect(screen.getByText('Ends in 4 minutes')).toBeOnTheScreen();
      });
    });
  });

  describe('given the featured pass ended 10 seconds ago by the clock', () => {
    beforeEach(() => {
      const pass = makePass({ startAt: NOW - 3 * MINUTE });
      scene = { props: { passes: [pass] }, clockNow: pass.endAt + 10_000 };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it says the pass has just ended', () => {
        expect(screen.getByText('Just ended')).toBeOnTheScreen();
      });

      test('then it no longer calls the pass visible now', () => {
        expect(screen.queryByText('Visible now')).toBeNull();
      });

      test('then it says where the pass was last seen', () => {
        expect(screen.getByText(/^Last seen in the /)).toBeOnTheScreen();
      });
    });
  });

  describe('given two passes tonight and one tomorrow night', () => {
    beforeEach(() => {
      scene = {
        props: {
          passes: [
            makePass({ id: 1 }),
            makePass({ id: 2, startAt: NOW + 3 * 60 * MINUTE }),
            makePass({ id: 3, startAt: new Date(2026, 10, 9, 21, 0).getTime() }),
          ],
        },
      };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then the summary counts only tonight', () => {
        expect(screen.getByText('2 passes · 2 bright')).toBeOnTheScreen();
      });

      test('then it lists tonight under its own heading', () => {
        expect(screen.getByRole('header', { name: 'Tonight' })).toBeOnTheScreen();
      });

      test('then it lists tomorrow night under its own heading', () => {
        expect(screen.getByRole('header', { name: 'Tomorrow night' })).toBeOnTheScreen();
      });
    });
  });

  describe('given there are no visible passes', () => {
    beforeEach(() => {
      scene = { props: { passes: [], computing: false } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it says there are no visible passes', () => {
        expect(screen.getByText('No visible passes in the next two nights.')).toBeOnTheScreen();
      });

      test('then it shows no pass count', () => {
        expect(screen.queryByText(/^\d+ passes?/)).toBeNull();
      });
    });
  });

  describe('given the passes for a new place are being worked out', () => {
    beforeEach(() => {
      scene = { props: { passes: [makePass()], computing: true, stale: true } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it shows progress', () => {
        expect(screen.getByText('Working out the passes over you…')).toBeOnTheScreen();
      });

      test('then it hides the old list', () => {
        expect(screen.queryByText('SL-16 R/B')).toBeNull();
      });
    });
  });

  describe('given the passes for the same place are being refreshed', () => {
    beforeEach(() => {
      scene = { props: { passes: [makePass()], computing: true, stale: false } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it keeps the list', () => {
        expect(screen.getByText('SL-16 R/B')).toBeOnTheScreen();
      });
    });
  });

  describe('given there are no passes yet and they are being worked out', () => {
    beforeEach(() => {
      scene = { props: { passes: [], computing: true } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it shows progress instead of an empty list', () => {
        expect(screen.getByText('Working out the passes over you…')).toBeOnTheScreen();
      });
    });
  });

  describe('given the demo evening', () => {
    beforeEach(() => {
      scene = { props: { demoStartsAt: NOW } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it says it is showing the demo evening', () => {
        expect(
          screen.getByText('Demo mode: Sunday, November 8 in London. Turn it off in Settings.'),
        ).toBeOnTheScreen();
      });

      test('then it names London as the place', () => {
        expect(screen.getByText('London, United Kingdom')).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen opened with Reykjavík chosen as the city', () => {
    let onChooseCity: jest.Mock;

    beforeEach(async () => {
      onChooseCity = jest.fn();
      await renderView({ chosenLocation: { name: 'Reykjavík', country: 'Iceland' }, onChooseCity });
    });

    describe('when the user presses the city under the title', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByText('Reykjavík, Iceland'));
      });

      test('then it lets the user change the city', () => {
        expect(onChooseCity).toHaveBeenCalled();
      });
    });
  });

  describe('given no city is chosen', () => {
    beforeEach(() => {
      scene = { props: { chosenLocation: null } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it says it is using the phone’s location', () => {
        expect(screen.getByText('Your location')).toBeOnTheScreen();
      });
    });
  });

  describe('given the phone is offline', () => {
    beforeEach(() => {
      scene = { props: { offline: true, passes: [makePass()] } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it shows the offline banner', () => {
        expect(screen.getByText(/You’re offline/)).toBeOnTheScreen();
      });

      test('then it keeps listing passes', () => {
        expect(screen.getByText('SL-16 R/B')).toBeOnTheScreen();
      });
    });
  });

  describe('given the orbit data is 4 days old', () => {
    beforeEach(() => {
      scene = { props: { staleDays: 4 } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it warns that the predictions may be off', () => {
        expect(
          screen.getByText('Orbit data is 4 days old, so predictions may be off by a few minutes.'),
        ).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen opened with location refused but the system can ask again', () => {
    let onAllowLocation: jest.Mock;

    beforeEach(async () => {
      onAllowLocation = jest.fn();
      await renderView({ location: { status: 'denied', canAskAgain: true }, onAllowLocation });
    });

    describe('when the user presses Allow location', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Allow location' }));
      });

      test('then it asks for location', () => {
        expect(onAllowLocation).toHaveBeenCalled();
      });
    });
  });

  describe('given the screen opened with location refused and the system will not ask again', () => {
    let onChooseCity: jest.Mock;

    beforeEach(async () => {
      onChooseCity = jest.fn();
      await renderView({ location: { status: 'denied', canAskAgain: false }, onChooseCity });
    });

    describe('when the user presses Choose a city instead', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Choose a city instead' }));
      });

      test('then it opens the city picker', () => {
        expect(onChooseCity).toHaveBeenCalled();
      });
    });
  });

  describe('given location is refused and the system will not ask again', () => {
    beforeEach(() => {
      scene = { props: { location: { status: 'denied', canAskAgain: false } } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it sends the user to Settings', () => {
        expect(screen.getByRole('button', { name: 'Open Settings' })).toBeOnTheScreen();
      });
    });
  });

  describe('given the screen opened on a pass far enough away with no reminder set', () => {
    let toggle: jest.Mock;

    beforeEach(async () => {
      toggle = jest.fn();
      await renderView({ passes: [makePass()], reminders: { isSet: () => false, toggle } });
    });

    describe('when the user presses Remind me', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('switch', { name: 'Remind me' }));
      });

      test('then it toggles the reminder for the pass', () => {
        expect(toggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'SL-16 R/B' }));
      });
    });
  });

  describe('given a reminder is already set for the pass', () => {
    beforeEach(() => {
      scene = {
        props: { passes: [makePass()], reminders: { isSet: () => true, toggle: () => {} } },
      };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then the reminder switch is on', () => {
        expect(screen.getByRole('switch', { name: 'Remind me' })).toBeChecked();
      });

      test('then it says the reminder is set', () => {
        expect(screen.getByText('Reminder set')).toBeOnTheScreen();
      });
    });
  });

  describe('given the featured pass without a reminder and HST with one', () => {
    beforeEach(() => {
      scene = {
        props: {
          passes: [makePass(), HST_LATER],
          reminders: { isSet: (pass) => pass.id === 2, toggle: () => {} },
        },
      };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it offers a reminder bell on each row', () => {
        expect(screen.getAllByRole('switch', { name: 'Remind me' })).toHaveLength(2);
      });

      test('then HST’s bell is on', () => {
        expect(screen.getAllByRole('switch', { name: 'Remind me' })[1]).toBeChecked();
      });
    });
  });

  describe('given the screen opened on the featured pass and HST with a reminder', () => {
    let toggle: jest.Mock;

    beforeEach(async () => {
      toggle = jest.fn();
      await renderView({
        passes: [makePass(), HST_LATER],
        reminders: { isSet: (pass) => pass.id === 2, toggle },
      });
    });

    describe('when the user presses HST’s bell', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getAllByRole('switch', { name: 'Remind me' })[1]!);
      });

      test('then it toggles HST’s reminder', () => {
        expect(toggle).toHaveBeenCalledWith(expect.objectContaining({ name: 'HST' }));
      });
    });
  });

  describe('given a pass that starts too soon for a reminder', () => {
    beforeEach(() => {
      scene = {
        props: {
          passes: [makePass({ startAt: NOW + 2 * MINUTE })],
          reminders: { isSet: () => false, toggle: () => {} },
        },
      };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it offers no reminder', () => {
        expect(screen.queryByRole('switch')).toBeNull();
      });
    });
  });

  describe('given notifications are off in Settings', () => {
    beforeEach(() => {
      scene = { props: { reminders: null } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it offers no reminders', () => {
        expect(screen.queryByRole('switch')).toBeNull();
      });
    });
  });

  describe('given the phone is still finding the user’s location', () => {
    beforeEach(() => {
      scene = { props: { location: { status: 'locating' } } };
    });

    describe('when the screen opens', () => {
      beforeEach(openTheScreen);

      test('then it waits for a location before listing anything', () => {
        expect(screen.getByText('Finding your location…')).toBeOnTheScreen();
      });
    });
  });
});

describe('staleDaysFor', () => {
  describe('given orbit data that is recent or has never been fetched', () => {
    test.each<{ groups: string; fetchedAt: (number | null)[] }>([
      { groups: 'one group fetched two days ago', fetchedAt: [NOW - 2 * DAY] },
      { groups: 'no orbit groups', fetchedAt: [] },
      { groups: 'a group never fetched', fetchedAt: [null] },
    ])('then it gives no warning for $groups', ({ fetchedAt }) => {
      expect(staleDaysFor(fetchedAt, NOW)).toBe(null);
    });
  });

  describe('given orbit data that is three days old or more', () => {
    test.each([
      { groups: 'one group fetched three days ago', fetchedAt: [NOW - 3 * DAY], days: 3 },
      {
        groups: 'groups fetched one and five days ago',
        fetchedAt: [NOW - 1 * DAY, NOW - 5 * DAY],
        days: 5,
      },
    ])('then it warns of $days days for $groups', ({ fetchedAt, days }) => {
      expect(staleDaysFor(fetchedAt, NOW)).toBe(days);
    });
  });
});
