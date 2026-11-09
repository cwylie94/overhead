import { act, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import { AppDataProvider } from '@/data/AppDataContext';
import type { AppData } from '@/data/client';
import { prepareDatabase } from '@/data/prepareDatabase';
import { Text } from '@/ui/Text';

import { DatabaseGate } from '../DatabaseGate';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn() }));
jest.mock('@/data/prepareDatabase', () => ({ prepareDatabase: jest.fn() }));

const data = { key: 'test' } as AppData;

function deferred() {
  let resolve!: () => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<void>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

async function renderGate() {
  return render(
    <AppDataProvider data={data}>
      <DatabaseGate>
        <Text>Tonight</Text>
      </DatabaseGate>
    </AppDataProvider>,
  );
}

async function openTheApp() {
  await renderGate();
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DatabaseGate', () => {
  describe('given the database is still being prepared', () => {
    beforeEach(() => {
      jest.mocked(prepareDatabase).mockReturnValue(deferred().promise);
    });

    describe('when the app opens', () => {
      beforeEach(async () => {
        await renderGate();
      });

      test('then it prepares the database', () => {
        expect(prepareDatabase).toHaveBeenCalledWith(data);
      });

      test('then it does not show the app yet', () => {
        expect(screen.queryByText('Tonight')).toBeNull();
      });

      test('then it keeps the splash screen up', () => {
        expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
      });
    });
  });

  describe('given the app opened while the database was being prepared', () => {
    let preparation: ReturnType<typeof deferred>;

    beforeEach(async () => {
      preparation = deferred();
      jest.mocked(prepareDatabase).mockReturnValue(preparation.promise);
      await renderGate();
    });

    describe('when the database is ready', () => {
      beforeEach(async () => {
        await act(async () => preparation.resolve());
      });

      test('then it shows the app', () => {
        expect(screen.getByText('Tonight')).toBeOnTheScreen();
      });

      test('then it hides the splash screen', () => {
        expect(SplashScreen.hideAsync).toHaveBeenCalled();
      });
    });
  });

  describe('given the database cannot be opened', () => {
    beforeEach(() => {
      jest.mocked(prepareDatabase).mockRejectedValue(new Error('disk full'));
    });

    describe('when the app opens', () => {
      beforeEach(async () => {
        await openTheApp();
      });

      test('then it explains that the database could not be opened', () => {
        expect(screen.getByText("Couldn't open the database")).toBeOnTheScreen();
        expect(screen.getByText('disk full')).toBeOnTheScreen();
      });

      test('then it hides the splash screen', () => {
        expect(SplashScreen.hideAsync).toHaveBeenCalled();
      });
    });
  });

  describe('given preparing the database fails with something that is not an Error', () => {
    beforeEach(() => {
      jest.mocked(prepareDatabase).mockRejectedValue('locked');
    });

    describe('when the app opens', () => {
      beforeEach(async () => {
        await openTheApp();
      });

      test('then it shows what went wrong', () => {
        expect(screen.getByText('locked')).toBeOnTheScreen();
      });
    });
  });

  describe('given the app opened and closed while the database was being prepared', () => {
    let preparation: ReturnType<typeof deferred>;

    beforeEach(async () => {
      preparation = deferred();
      jest.mocked(prepareDatabase).mockReturnValue(preparation.promise);
      const { unmount } = await renderGate();
      await act(async () => unmount());
    });

    describe('when the database is ready', () => {
      beforeEach(async () => {
        await act(async () => preparation.resolve());
      });

      test('then it leaves the splash screen alone', () => {
        expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
      });
    });
  });
});
