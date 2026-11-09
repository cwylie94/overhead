import { is } from 'drizzle-orm';
import { getTableConfig, SQLiteTable, type AnySQLiteSelect } from 'drizzle-orm/sqlite-core';
import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState, type DependencyList } from 'react';

import { nextSequence } from '../sequence';
import { coalesce } from './coalesce';

export const LIVE_QUERY_SETTLE_MS = 50;
export const LIVE_QUERY_MAX_WAIT_MS = 500;

type LiveQuery = Pick<AnySQLiteSelect, '_' | 'then'>;

function tableNameOf(query: LiveQuery): string | null {
  const table = (query as unknown as { config?: { table?: unknown } }).config?.table;
  return is(table, SQLiteTable) ? getTableConfig(table).name : null;
}

export function useLiveQuery<T extends LiveQuery>(
  query: T,
  deps: DependencyList = [],
): { data: Awaited<T>; loadedAt: number | null } {
  const [result, setResult] = useState<{ data: Awaited<T>; loadedAt: number | null }>({
    data: [] as Awaited<T>,
    loadedAt: null,
  });

  useEffect(() => {
    let active = true;
    const load = () => {
      query.then(
        (rows) => {
          if (active) {
            setResult({ data: rows as Awaited<T>, loadedAt: nextSequence() });
          }
        },
        () => {},
      );
    };
    const reload = coalesce(load, LIVE_QUERY_SETTLE_MS, LIVE_QUERY_MAX_WAIT_MS);
    const tableName = tableNameOf(query);
    const subscription = tableName
      ? addDatabaseChangeListener((event) => {
          if (event.tableName === tableName) {
            reload.trigger();
          }
        })
      : null;

    load();
    return () => {
      active = false;
      reload.cancel();
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the query is rebuilt every render; callers pass what it depends on
  }, deps);

  return result;
}
