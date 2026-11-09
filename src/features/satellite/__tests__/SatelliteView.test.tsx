import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';

import { makeOmm } from '@/data/testing/fixtures';

import { SatelliteView, type SatelliteViewProps } from '../SatelliteView';

jest.mock('../SatelliteCard', () => {
  const { createElement, Fragment } = jest.requireActual<typeof import('react')>('react');
  return {
    SatelliteCard: ({ front, back }: { front: ReactNode; back: ReactNode }) =>
      createElement(Fragment, null, front, back),
  };
});

const NEXT_PASS = new Date(2026, 10, 8, 21, 12).getTime();

const SIGHTING = { id: 'a', observedAt: new Date(2026, 10, 7, 20, 30).getTime(), angleError: 4.25 };

const MODULE: SatelliteViewProps = {
  satellite: {
    noradId: 49044,
    name: 'ISS (NAUKA)',
    objectType: 'payload',
    owner: 'CIS',
    launchDate: '2021-07-21',
    rarity: 'common',
    collectionSet: 'spaceStations',
  },
  orbit: makeOmm(),
  hostName: 'ISS (ZARYA)',
  nextPassAt: NEXT_PASS,
  sightings: [],
  units: 'metric',
  onDeleteSighting: () => {},
  onClose: () => {},
};

async function openCard(props: Partial<SatelliteViewProps> = {}) {
  await render(<SatelliteView {...MODULE} {...props} />);
}

describe('SatelliteView', () => {
  describe('given a docked module that has never been caught', () => {
    describe('when the card opens', () => {
      beforeEach(async () => {
        await openCard();
      });

      test('then it shows the name and rarity', () => {
        expect(screen.getByText('ISS (NAUKA)')).toBeOnTheScreen();
        expect(screen.getByText('Common')).toBeOnTheScreen();
      });

      test('then it says the satellite has not been caught', () => {
        expect(screen.getByText('Not caught yet')).toBeOnTheScreen();
        expect(screen.getByText('You haven’t caught this one yet.')).toBeOnTheScreen();
      });

      test('then it names the station it is docked to', () => {
        expect(screen.getByText('Docked to')).toBeOnTheScreen();
        expect(screen.getByText('ISS (ZARYA)')).toBeOnTheScreen();
      });

      test('then it describes the orbit', () => {
        expect(screen.getByText('Orbit')).toBeOnTheScreen();
        expect(screen.getByText(/^\d+ minutes$/)).toBeOnTheScreen();
      });

      test('then it gives the time of the next visible pass', () => {
        expect(screen.getByText(/9:12\s?PM$/)).toBeOnTheScreen();
      });
    });
  });

  describe('given a satellite with no orbit, no host and no pass coming up', () => {
    describe('when the card opens', () => {
      beforeEach(async () => {
        await openCard({ orbit: null, hostName: null, nextPassAt: null });
      });

      test('then it leaves out the orbit and the host', () => {
        expect(screen.queryByText('Orbit')).toBeNull();
        expect(screen.queryByText('Docked to')).toBeNull();
      });

      test('then it says there is no visible pass soon', () => {
        expect(screen.getByText('No visible pass in the next two nights')).toBeOnTheScreen();
      });
    });
  });

  describe('given a satellite caught once', () => {
    describe('when the card opens', () => {
      beforeEach(async () => {
        await openCard({ sightings: [SIGHTING] });
      });

      test('then it counts the catch', () => {
        expect(screen.getByText('Caught once')).toBeOnTheScreen();
      });

      test('then it gives the best aim', () => {
        expect(screen.getByText('Best aim 4.3° off')).toBeOnTheScreen();
      });

      test('then it no longer says the satellite has not been caught', () => {
        expect(screen.queryByText('Not caught yet')).toBeNull();
      });
    });
  });

  describe('given the card is open on a satellite caught once', () => {
    let onDeleteSighting: jest.Mock;

    beforeEach(async () => {
      onDeleteSighting = jest.fn();
      jest.spyOn(Alert, 'alert');
      await openCard({ sightings: [SIGHTING], onDeleteSighting });
    });

    describe('when the user deletes the sighting and confirms', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: /^Delete the sighting from/ }));
        const buttons = jest.mocked(Alert.alert).mock.calls[0]![2]!;
        buttons.find((button) => button.style === 'destructive')!.onPress!();
      });

      test('then it deletes that sighting', () => {
        expect(onDeleteSighting).toHaveBeenCalledWith('a');
      });
    });

    describe('when the user deletes the sighting and cancels', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: /^Delete the sighting from/ }));
      });

      test('then nothing is deleted', () => {
        expect(onDeleteSighting).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the card is open', () => {
    let onClose: jest.Mock;

    beforeEach(async () => {
      onClose = jest.fn();
      await openCard({ onClose });
    });

    describe('when the user presses Close', () => {
      beforeEach(async () => {
        await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
      });

      test('then the card closes', () => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });
});
