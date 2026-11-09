import { fireEvent, render, screen } from '@testing-library/react-native';

import type { UpcomingPass } from '@/data/queries';

import { SkyView, type SkyViewProps } from '../SkyView';

const mockBackToNow = jest.fn();
const mockSkyDome = jest.fn((_props: { onSelect(noradId: number | null): void }) => null);

jest.mock('../SkyDome', () => ({
  SkyDome: (props: { onSelect(noradId: number | null): void }) => mockSkyDome(props),
}));
jest.mock('../TimelineScrubber', () => ({ TimelineScrubber: () => null }));
jest.mock('../useCompassHeading', () => ({ useCompassHeading: () => ({}) }));
jest.mock('../useSkyTime', () => ({
  useSkyTime: () => ({ base: {}, offset: {}, time: {}, backToNow: mockBackToNow }),
}));

const NOW = new Date(2026, 10, 8, 21, 0).getTime();
const MINUTE = 60_000;

const ISS: UpcomingPass = {
  id: 1,
  noradId: 25544,
  startAt: NOW - MINUTE,
  peakAt: NOW + MINUTE,
  endAt: NOW + 3 * MINUTE,
  maxElevation: 62,
  peakMagnitude: -3,
  track: [
    { time: NOW - 2 * MINUTE, azimuth: 270, elevation: 5 },
    { time: NOW + MINUTE, azimuth: 0, elevation: 62 },
    { time: NOW + 4 * MINUTE, azimuth: 90, elevation: 5 },
  ],
  name: 'ISS (ZARYA)',
  rarity: 'common',
};

const DEFAULTS: SkyViewProps = {
  passes: [ISS],
  now: NOW,
  selectedId: null,
  timeOffset: 0,
  onSelect: () => {},
  onCommitOffset: () => {},
};

async function openSky(props: Partial<SkyViewProps> = {}) {
  await render(<SkyView {...DEFAULTS} {...props} />);
  await fireEvent(screen.getByTestId('sky'), 'layout', {
    nativeEvent: { layout: { width: 320, height: 640 } },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SkyView', () => {
  describe('given no passes in the next 12 hours', () => {
    describe('when the Sky view opens', () => {
      beforeEach(async () => {
        await openSky({ passes: [] });
      });

      test('then it says there is nothing to see', () => {
        expect(screen.getByText('No visible passes in the next 12 hours.')).toBeOnTheScreen();
      });
    });
  });

  describe('given the ISS is up and selected', () => {
    describe('when the Sky view opens', () => {
      beforeEach(async () => {
        await openSky({ selectedId: ISS.noradId });
      });

      test('then it describes the selected satellite', () => {
        expect(screen.getByText('ISS (ZARYA)')).toBeOnTheScreen();
      });

      test('then it leaves the compass off', () => {
        expect(screen.getByRole('switch', { name: 'Compass' })).not.toBeChecked();
      });
    });
  });

  describe('given the Sky view is open', () => {
    let onSelect: jest.Mock;

    beforeEach(async () => {
      onSelect = jest.fn();
      await openSky({ onSelect });
    });

    describe('when the user taps a satellite on the dome', () => {
      beforeEach(() => {
        mockSkyDome.mock.calls.at(-1)![0].onSelect(ISS.noradId);
      });

      test('then it selects that satellite', () => {
        expect(onSelect).toHaveBeenCalledWith(ISS.noradId);
      });
    });

    describe('when the user turns the compass on', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('switch', { name: 'Compass' }));
      });

      test('then the compass is on', () => {
        expect(screen.getByRole('switch', { name: 'Compass' })).toBeChecked();
        expect(screen.getByText('Compass on')).toBeOnTheScreen();
      });
    });
  });

  describe('given the Sky view is looking 20 minutes ahead', () => {
    let onCommitOffset: jest.Mock;

    beforeEach(async () => {
      onCommitOffset = jest.fn();
      await openSky({ timeOffset: 20 * MINUTE, onCommitOffset });
    });

    describe('when the user presses Now', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Now' }));
      });

      test('then the timeline slides back to now', () => {
        expect(mockBackToNow).toHaveBeenCalled();
      });

      test('then the view goes back to now', () => {
        expect(onCommitOffset).toHaveBeenCalledWith(0);
      });
    });
  });
});
