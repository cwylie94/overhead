import type { OmmRecord } from './types';

function elementsKey(omm: OmmRecord): string {
  return [
    omm.EPOCH,
    omm.MEAN_MOTION,
    omm.ECCENTRICITY,
    omm.INCLINATION,
    omm.RA_OF_ASC_NODE,
    omm.ARG_OF_PERICENTER,
    omm.MEAN_ANOMALY,
  ].join('|');
}

export function dockingHosts(omms: readonly OmmRecord[]): Map<number, number> {
  const groups = new Map<string, number[]>();
  for (const omm of omms) {
    const key = elementsKey(omm);
    groups.set(key, [...(groups.get(key) ?? []), omm.NORAD_CAT_ID]);
  }

  const hosts = new Map<number, number>();
  for (const ids of groups.values()) {
    const members = [...new Set(ids)];
    if (members.length < 2) {
      continue;
    }
    const host = Math.min(...members);
    for (const id of members) {
      if (id !== host) {
        hosts.set(id, host);
      }
    }
  }
  return hosts;
}
