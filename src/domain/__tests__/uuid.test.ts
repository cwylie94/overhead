import { uuidv7 } from '../uuid';

const T = Date.UTC(2026, 10, 8, 21, 14);
const random = (fill: number) => new Uint8Array(10).fill(fill);

describe('uuidv7', () => {
  describe('given a time and ten random bytes', () => {
    test('then it is a version 7 UUID with the RFC 9562 variant', () => {
      expect(uuidv7(T, random(0xff))).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });

    test('then it starts with the millisecond timestamp', () => {
      expect(uuidv7(T, random(0)).replace(/-/g, '').slice(0, 12)).toBe(
        T.toString(16).padStart(12, '0'),
      );
    });
  });

  describe('given an earlier time with the highest random bytes and a later one with the lowest', () => {
    test('then the IDs sort by time', () => {
      expect(uuidv7(T, random(0xff)) < uuidv7(T + 1, random(0))).toBe(true);
    });
  });

  describe('given the same time with different random bytes', () => {
    test('then the IDs differ', () => {
      expect(uuidv7(T, random(1))).not.toBe(uuidv7(T, random(2)));
    });
  });

  describe('given too few random bytes', () => {
    test('then it refuses them', () => {
      expect(() => uuidv7(T, new Uint8Array(4))).toThrow('10 random bytes');
    });
  });
});
