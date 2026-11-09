import type { Rarity } from '@/domain/types';
import { matchesFilter } from '@/features/tonight/featured';
import { groupByNight, type NightLabel } from '@/features/tonight/nights';

export type ChancePass = {
  noradId: number;
  rarity: Rarity;
  startAt: number;
  endAt: number;
  maxElevation: number;
  peakMagnitude: number | null;
};

export type CatchTonight<T> = {
  label: NightLabel;
  passes: T[];
};

export function catchTonight<T extends ChancePass>(
  passes: T[],
  caught: ReadonlySet<number>,
  now: number,
): CatchTonight<T> | null {
  const chances = passes.filter(
    (pass) => pass.endAt > now && !caught.has(pass.noradId) && matchesFilter(pass, 'worth'),
  );
  const night = groupByNight(chances, now)[0];
  if (!night) {
    return null;
  }
  const listed = new Set<number>();
  const firstChances = night.data.filter((pass) => {
    if (listed.has(pass.noradId)) {
      return false;
    }
    listed.add(pass.noradId);
    return true;
  });
  return { label: night.label, passes: firstChances };
}
