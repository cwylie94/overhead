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
  describe('given a device database that has not been prepared', () => {
    let data: AppData;
    let order: string[];

    beforeEach(() => {
      data = appData('device');
      order = [];
      jest.mocked(migrate).mockImplementation(async () => {
        order.push('migrate');
      });
      jest.mocked(importSnapshot).mockImplementation(() => {
        order.push('import');
        return { catalogueImported: false, groupsImported: [] } as unknown as ReturnType<
          typeof importSnapshot
        >;
      });
    });

    describe('when it is prepared', () => {
      beforeEach(async () => {
        await prepareDatabase(data);
      });

      test('then it migrates before importing the bundled snapshot', () => {
        expect(order).toEqual(['migrate', 'import']);
      });

      test('then it migrates that database', () => {
        expect(migrate).toHaveBeenCalledWith(data.db, expect.anything());
      });

      test('then it imports the bundled snapshot into its repositories', () => {
        expect(importSnapshot).toHaveBeenCalledWith(data.repositories, bundledSnapshot);
      });
    });
  });

  describe('given a device database', () => {
    let data: AppData;

    beforeEach(() => {
      data = appData('device');
    });

    describe('when it is asked to prepare twice at once and then again', () => {
      beforeEach(async () => {
        await Promise.all([prepareDatabase(data), prepareDatabase(data)]);
        await prepareDatabase(data);
      });

      test('then it is migrated once', () => {
        expect(migrate).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('given a demo database has been prepared', () => {
    beforeEach(async () => {
      await prepareDatabase(appData('demo-1'));
    });

    describe('when a new demo database is prepared', () => {
      beforeEach(async () => {
        await prepareDatabase(appData('demo-2'));
      });

      test('then the new one is migrated too', () => {
        expect(migrate).toHaveBeenCalledTimes(2);
      });
    });
  });
});
