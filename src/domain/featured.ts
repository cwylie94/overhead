import { brightnessTier, NAKED_EYE_LIMIT } from './brightness';
import { catchWindow } from './catchWindow';
import type { Rarity } from './types';

export type RankedPass = {
  startAt: number;
  endAt: number;
  maxElevation: number;
  peakMagnitude: number | null;
  rarity: Rarity;
};

const RARITY_BONUS: Readonly<Record<Rarity, number>> = {
  legendary: 4,
  rare: 3,
  uncommon: 1,
  common: 0,
};

export const LOW_ELEVATION = 30;

export function passScore(pass: RankedPass): number {
  const magnitude = pass.peakMagnitude ?? NAKED_EYE_LIMIT;
  return (NAKED_EYE_LIMIT - magnitude) * 3 + RARITY_BONUS[pass.rarity] + pass.maxElevation / 30;
}

export type FeaturedReason = 'live' | 'soon' | 'best';
export type Featured<T> = { pass: T; reason: FeaturedReason };

function best<T extends RankedPass>(passes: T[]): T | undefined {
  return passes.reduce<T | undefined>(
    (top, pass) => (!top || passScore(pass) > passScore(top) ? pass : top),
    undefined,
  );
}

export function featuredPass<T extends RankedPass>(passes: T[], now: number): Featured<T> | null {
  const upcoming = passes.filter((pass) => pass.endAt > now);
  const live = best(upcoming.filter((pass) => catchWindow(pass, now) === 'live'));
  if (live) {
    return { pass: live, reason: 'live' };
  }
  const soon = best(upcoming.filter((pass) => catchWindow(pass, now) === 'ready'));
  if (soon) {
    return { pass: soon, reason: 'soon' };
  }
  const top = best(upcoming);
  return top ? { pass: top, reason: 'best' } : null;
}

export const PASS_FILTERS = ['worth', 'rare', 'all'] as const;
export type PassFilter = (typeof PASS_FILTERS)[number];

export function matchesFilter(pass: RankedPass, filter: PassFilter): boolean {
  if (filter === 'rare') {
    return pass.rarity === 'rare' || pass.rarity === 'legendary';
  }
  if (filter === 'worth') {
    const faint = pass.peakMagnitude === null || brightnessTier(pass.peakMagnitude) === 'faint';
    return !faint || pass.maxElevation >= LOW_ELEVATION;
  }
  return true;
}
