import { sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';

const MAX_ROWS_PER_INSERT = 200;

export function chunk<T>(items: T[], size = MAX_ROWS_PER_INSERT): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}

export function excluded(column: SQLiteColumn): SQL {
  return sql`excluded.${sql.identifier(column.name)}`;
}
