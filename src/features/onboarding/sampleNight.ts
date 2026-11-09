import type { BrightnessTier } from '@/domain/brightness';
import { LOUPE_SPAN } from '@/ui/timelineScrub';

const MINUTE = 60_000;
const TRACK_SHARE_MAGNIFIED = 0.12;
const SWEEP_FROM = 0.04;
const SWEEP_TO = 0.96;

export const DEMO_START = new Date(2026, 0, 1, 18, 0).getTime();
export const DEMO_SPAN = LOUPE_SPAN / TRACK_SHARE_MAGNIFIED;

const SAMPLE: { name: string; minutes: number; tier: BrightnessTier }[] = [
  { name: 'CZ-2C R/B', minutes: 22, tier: 'faint' },
  { name: 'ISS (ZARYA)', minutes: 41, tier: 'brilliant' },
  { name: 'SL-16 R/B', minutes: 44, tier: 'bright' },
  { name: 'ARIANE 5 R/B', minutes: 52, tier: 'faint' },
  { name: 'SAOCOM 1B', minutes: 66, tier: 'bright' },
  { name: 'H-2A R/B', minutes: 91, tier: 'faint' },
  { name: 'HST', minutes: 130, tier: 'brilliant' },
  { name: 'ERS-1', minutes: 136, tier: 'bright' },
  { name: 'COSMOS 1867', minutes: 182, tier: 'faint' },
  { name: 'SL-8 R/B', minutes: 220, tier: 'bright' },
  { name: 'OAO 3', minutes: 260, tier: 'brilliant' },
  { name: 'GXIBA-1', minutes: 267, tier: 'faint' },
  { name: 'CZ-4B R/B', minutes: 315, tier: 'bright' },
  { name: 'ENVISAT', minutes: 352, tier: 'bright' },
];

export const DEMO_PASSES = SAMPLE.map((pass, index) => ({
  id: index,
  name: pass.name,
  tier: pass.tier,
  startAt: DEMO_START + pass.minutes * MINUTE,
}));

export function demoFraction(progress: number): number {
  'worklet';
  return SWEEP_FROM + progress * (SWEEP_TO - SWEEP_FROM);
}

export function demoCenter(progress: number): number {
  'worklet';
  return DEMO_START + demoFraction(progress) * DEMO_SPAN;
}

export function progressAt(time: number): number {
  return ((time - DEMO_START) / DEMO_SPAN - SWEEP_FROM) / (SWEEP_TO - SWEEP_FROM);
}
