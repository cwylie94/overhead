import type { Snapshot } from './importSnapshot';
import meta from './meta.json';
import satcat from './satcat.json';
import stations from './stations.json';
import visual from './visual.json';

export const bundledSnapshot: Snapshot = {
  fetchedAt: Date.parse(meta.fetchedAt),
  groups: { visual, stations },
  satcat,
};

export { importSnapshot, type Snapshot, type SnapshotImportResult } from './importSnapshot';
