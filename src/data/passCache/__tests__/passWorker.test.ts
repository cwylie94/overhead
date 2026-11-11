import { london, skyfield } from '@/domain/testing/skyfieldFixture';

import type { PassOrbit } from '../passRows';

const mockRuntime = { name: 'pass-worker' };
const mockCreateWorkletRuntime = jest.fn((_config: { name: string }) => mockRuntime);
const mockRunOnRuntimeAsync = jest.fn(
  async (_runtime: unknown, worklet: (...args: unknown[]) => unknown, ...args: unknown[]) =>
    worklet(...args),
);

jest.mock('react-native-worklets', () => ({
  createWorkletRuntime: (config: { name: string }) => mockCreateWorkletRuntime(config),
  runOnRuntimeAsync: (
    runtime: unknown,
    worklet: (...args: unknown[]) => unknown,
    ...args: unknown[]
  ) => mockRunOnRuntimeAsync(runtime, worklet, ...args),
}));

const search = {
  observer: london,
  from: skyfield.window.start,
  to: skyfield.window.start + 16 * 60 * 60_000,
  minElevation: 10,
};
const NO_ORBITS: PassOrbit[] = [];

describe('computePassRowsOnWorker', () => {
  describe('given the worker has not been used yet', () => {
    let computePassRowsOnWorker: typeof import('../passWorker').computePassRowsOnWorker;
    let passRows: typeof import('../passRows').passRows;

    beforeEach(() => {
      jest.isolateModules(() => {
        ({ computePassRowsOnWorker } =
          jest.requireActual<typeof import('../passWorker')>('../passWorker'));
        ({ passRows } = jest.requireActual<typeof import('../passRows')>('../passRows'));
      });
      mockCreateWorkletRuntime.mockClear();
      mockRunOnRuntimeAsync.mockClear();
    });

    describe('when two batches are worked out', () => {
      let results: unknown[];

      beforeEach(async () => {
        results = [
          await computePassRowsOnWorker(NO_ORBITS, search),
          await computePassRowsOnWorker(NO_ORBITS, search),
        ];
      });

      test('then it starts one worker runtime', () => {
        expect(mockCreateWorkletRuntime.mock.calls).toEqual([[{ name: 'pass-worker' }]]);
      });

      test('then it runs the pass rows on that runtime', () => {
        expect(mockRunOnRuntimeAsync).toHaveBeenCalledWith(
          mockRuntime,
          passRows,
          NO_ORBITS,
          search,
        );
      });

      test('then it returns what the worker worked out', () => {
        expect(results).toEqual([[], []]);
      });
    });
  });
});
