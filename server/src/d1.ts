export type D1Value = string | number | null;

export type D1Bound = {
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
};

export type D1Prepared = D1Bound & {
  bind(...values: D1Value[]): D1Bound;
};

export type D1Like = {
  prepare(sql: string): D1Prepared;
  batch(statements: D1Bound[]): Promise<unknown[]>;
};
