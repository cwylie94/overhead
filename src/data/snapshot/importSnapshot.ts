import {
  catalogueEntryFromSatcat,
  ommEpochToMillis,
  RARITY_RULES_VERSION,
  type SatcatRecord,
} from '@/domain/catalogue';
import { CELESTRAK_GROUPS, type CelestrakGroup, type OmmRecord } from '@/domain/types';

import type { Repositories } from '../repositories';

export type Snapshot = {
  fetchedAt: number;
  groups: Record<CelestrakGroup, OmmRecord[]>;
  satcat: SatcatRecord[];
};

export type SnapshotImportResult = {
  catalogue: boolean;
  groups: CelestrakGroup[];
};

export const CATALOGUE_VERSION_KEY = 'snapshot.catalogueVersion';

export function catalogueVersion(snapshot: Snapshot, rarityRulesVersion: number): string {
  return `${snapshot.fetchedAt}/rarity-${rarityRulesVersion}`;
}

export function importSnapshot(
  repositories: Pick<Repositories, 'satellites' | 'orbits' | 'syncMeta'>,
  snapshot: Snapshot,
  rarityRulesVersion: number = RARITY_RULES_VERSION,
): SnapshotImportResult {
  const { satellites, orbits, syncMeta } = repositories;
  const stationIds = new Set(snapshot.groups.stations.map((omm) => omm.NORAD_CAT_ID));

  const version = catalogueVersion(snapshot, rarityRulesVersion);
  const catalogue = syncMeta.get(CATALOGUE_VERSION_KEY) !== version;
  if (catalogue) {
    satellites.upsertMany(
      snapshot.satcat.map((record) =>
        catalogueEntryFromSatcat(record, stationIds.has(record.NORAD_CAT_ID)),
      ),
    );
    syncMeta.set(CATALOGUE_VERSION_KEY, version);
  }

  const groups = CELESTRAK_GROUPS.filter(
    (group) => (orbits.latestFetchedAt(group) ?? Number.NEGATIVE_INFINITY) < snapshot.fetchedAt,
  );
  for (const group of groups) {
    orbits.replaceGroup(
      group,
      snapshot.groups[group].map((omm) => ({
        noradId: omm.NORAD_CAT_ID,
        group,
        omm,
        epoch: ommEpochToMillis(omm.EPOCH),
        fetchedAt: snapshot.fetchedAt,
      })),
    );
  }

  return { catalogue, groups };
}
