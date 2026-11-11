import {
  createWorkletRuntime,
  runOnRuntimeAsync,
  type WorkletRuntime,
} from 'react-native-worklets';

import type { ComputePassRows } from './passCache';
import { passRows } from './passRows';

let runtime: WorkletRuntime | null = null;

export const computePassRowsOnWorker: ComputePassRows = (orbits, search) => {
  runtime ??= createWorkletRuntime({ name: 'pass-worker' });
  return runOnRuntimeAsync(runtime, passRows, orbits, search);
};
