import { render } from '@testing-library/react-native';

import type { OrbitRefresher } from '@/sync/orbitRefresher';

import { useAppSession, type AppSession } from '../appSession';
import { DEMO_FEATURES, DEVICE_FEATURES } from '../features';
import { OrbitUpdates } from '../OrbitUpdates';

jest.mock('../appSession', () => ({ useAppSession: jest.fn() }));

const stop = jest.fn();
const refresher = { start: jest.fn(() => stop) } as unknown as OrbitRefresher;

function useSession(features: AppSession['features']) {
  jest
    .mocked(useAppSession)
    .mockReturnValue({ features, orbitRefresher: refresher } as unknown as AppSession);
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('OrbitUpdates', () => {
  describe('given orbit updates are on', () => {
    beforeEach(() => {
      useSession(DEVICE_FEATURES);
    });

    describe('when it mounts', () => {
      beforeEach(async () => {
        await render(<OrbitUpdates />);
      });

      test('then it starts the orbit refresher', () => {
        expect(refresher.start).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given orbit updates have started', () => {
    let rendered: Awaited<ReturnType<typeof render>>;

    beforeEach(async () => {
      useSession(DEVICE_FEATURES);
      rendered = await render(<OrbitUpdates />);
    });

    describe('when it renders again', () => {
      beforeEach(async () => {
        await rendered.rerender(<OrbitUpdates />);
      });

      test('then it does not start the refresher again', () => {
        expect(refresher.start).toHaveBeenCalledTimes(1);
      });
    });

    describe('when it unmounts', () => {
      beforeEach(async () => {
        await rendered.unmount();
      });

      test('then it stops the refresher', () => {
        expect(stop).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given orbit updates are off for the demo', () => {
    beforeEach(() => {
      useSession(DEMO_FEATURES);
    });

    describe('when it mounts', () => {
      beforeEach(async () => {
        await render(<OrbitUpdates />);
      });

      test('then it does not start the refresher', () => {
        expect(refresher.start).not.toHaveBeenCalled();
      });
    });
  });
});
