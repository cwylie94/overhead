import { uuidv7 } from '../uuid';

const T = Date.UTC(2026, 10, 8, 21, 14);
const random = (fill: number) => new Uint8Array(10).fill(fill);

describe('uuidv7', () => {
  test('is a version 7 UUID with the RFC 9562 variant', () => {
    const id = uuidv7(T, random(0xff));

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  test('starts with the millisecond timestamp, so IDs sort by time', () => {
    expect(uuidv7(T, random(0)).replace(/-/g, '').slice(0, 12)).toBe(
      T.toString(16).padStart(12, '0'),
    );
    expect(uuidv7(T, random(0xff)) < uuidv7(T + 1, random(0))).toBe(true);
  });

  test('differs when the random bytes differ', () => {
    expect(uuidv7(T, random(1))).not.toBe(uuidv7(T, random(2)));
  });

  test('refuses too few random bytes', () => {
    expect(() => uuidv7(T, new Uint8Array(4))).toThrow('10 random bytes');
  });
});
