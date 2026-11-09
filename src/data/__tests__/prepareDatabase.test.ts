import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import type { AppData } from '../client';
import { prepareDatabase } from '../prepareDatabase';
import { bundledSnapshot, importSnapshot } from '../snapshot';

jest.mock('drizzle-orm/expo-sqlite/migrator', () => ({ migrate: jest.fn() }));
jest.mock('../migrations/migrations', () => ({ journal: {}, migrations: {} }));
jest.mock('../snapshot', () => ({ bundledSnapshot: { fetchedAt: 0 }, importSnapshot: jest.fn() }));

function appData(key: string): AppData {
  return { key, db: {}, repositories: {} } as AppData;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(migrate).mockResolvedValue();
});

describe('prepareDatabase', () => {
  test('migrates, then imports the bundled snapshot', async () => {
    const data = appData('device');
    const order: string[] = [];
    jest.mocked(migrate).mockImplementation(async () => {
      order.push('migrate');
    });
    jest.mocked(importSnapshot).mockImplementation(() => {
      order.push('import');
      return { catalogueImported: false, groupsImported: [] } as unknown as ReturnType<
        typeof importSnapshot
      >;
    });

    await prepareDatabase(data);

    expect(order).toEqual(['migrate', 'import']);
    expect(migrate).toHaveBeenCalledWith(data.db, expect.anything());
    expect(importSnapshot).toHaveBeenCalledWith(data.repositories, bundledSnapshot);
  });

  test('prepares each database once, however often it is asked', async () => {
    const data = appData('device');

    await Promise.all([prepareDatabase(data), prepareDatabase(data)]);
    await prepareDatabase(data);

    expect(migrate).toHaveBeenCalledTimes(1);
  });

  test('prepares a new demo database again', async () => {
    await prepareDatabase(appData('demo-1'));
    await prepareDatabase(appData('demo-2'));

    expect(migrate).toHaveBeenCalledTimes(2);
  });
});
