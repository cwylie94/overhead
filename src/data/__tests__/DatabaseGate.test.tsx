import { act, render, screen } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';

import { Text } from '@/ui/Text';

import { AppDataProvider } from '../AppDataContext';
import type { AppData } from '../client';
import { DatabaseGate } from '../DatabaseGate';
import { prepareDatabase } from '../prepareDatabase';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn() }));
jest.mock('../prepareDatabase', () => ({ prepareDatabase: jest.fn() }));

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('DatabaseGate', () => {
  test('keeps the splash screen up while the database is prepared', async () => {
    const preparation = deferred();
    jest.mocked(prepareDatabase).mockReturnValue(preparation.promise);

    await renderGate();

    expect(prepareDatabase).toHaveBeenCalledWith(data);
    expect(screen.queryByText('Tonight')).toBeNull();
    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });

  test('shows the app and hides the splash screen once the database is ready', async () => {
    const preparation = deferred();
    jest.mocked(prepareDatabase).mockReturnValue(preparation.promise);
    await renderGate();

    await act(async () => preparation.resolve());

    expect(screen.getByText('Tonight')).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  test('explains a database that could not be opened', async () => {
    jest.mocked(prepareDatabase).mockRejectedValue(new Error('disk full'));

    await renderGate();
    await act(async () => {});

    expect(screen.getByText("Couldn't open the database")).toBeOnTheScreen();
    expect(screen.getByText('disk full')).toBeOnTheScreen();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  test('reports a failure that is not an Error', async () => {
    jest.mocked(prepareDatabase).mockRejectedValue('locked');

    await renderGate();
    await act(async () => {});

    expect(screen.getByText('locked')).toBeOnTheScreen();
  });

  test('ignores a preparation that finishes after it has gone', async () => {
    const preparation = deferred();
    jest.mocked(prepareDatabase).mockReturnValue(preparation.promise);
    const { unmount } = await renderGate();

    await act(async () => unmount());
    await act(async () => preparation.resolve());

    expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  });
});
