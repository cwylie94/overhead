import { moonLookAngles } from '@/domain/moon';
import { toGeodetic, type Observer } from '@/domain/observer';
import { DEFAULT_SUN_DARK_BELOW } from '@/domain/passFinder';
import { sunLookAngles } from '@/domain/sun';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const STEP = 10 * MINUTE;
const SPAN = 24 * HOUR;
const SUNSET_ELEVATION = -0.833;

export type Interval = { from: number; to: number };

export type NightSky = {
  sunset: number | null;
  darkFrom: number | null;
  darkUntil: number | null;
  sunrise: number | null;
  moonUp: Interval[];
};

type Sample = { time: number; elevation: number };

function sample(from: number, elevationAt: (time: number) => number): Sample[] {
  const samples: Sample[] = [];
  for (let time = from; time <= from + SPAN; time += STEP) {
    samples.push({ time, elevation: elevationAt(time) });
  }
  return samples;
}

function crossing(a: Sample, b: Sample, level: number): number {
  const fraction = (level - a.elevation) / (b.elevation - a.elevation);
  return a.time + fraction * (b.time - a.time);
}

function findCrossing(
  samples: Sample[],
  level: number,
  direction: 'down' | 'up',
  after: number,
): number | null {
  for (let index = 1; index < samples.length; index++) {
    const a = samples[index - 1]!;
    const b = samples[index]!;
    if (b.time <= after) {
      continue;
    }
    const crosses =
      direction === 'down'
        ? a.elevation >= level && b.elevation < level
        : a.elevation < level && b.elevation >= level;
    if (crosses) {
      return crossing(a, b, level);
    }
  }
  return null;
}

function intervalsAbove(samples: Sample[], level: number): Interval[] {
  const intervals: Interval[] = [];
  let from: number | null = samples[0] && samples[0].elevation >= level ? samples[0].time : null;
  for (let index = 1; index < samples.length; index++) {
    const a = samples[index - 1]!;
    const b = samples[index]!;
    if (from === null && a.elevation < level && b.elevation >= level) {
      from = crossing(a, b, level);
    } else if (from !== null && a.elevation >= level && b.elevation < level) {
      intervals.push({ from, to: crossing(a, b, level) });
      from = null;
    }
  }
  if (from !== null) {
    intervals.push({ from, to: samples[samples.length - 1]!.time });
  }
  return intervals;
}

export function nightSky(
  observer: Observer,
  noon: number,
  darkBelow = DEFAULT_SUN_DARK_BELOW,
): NightSky {
  const geodetic = toGeodetic(observer);
  const sun = sample(noon, (time) => sunLookAngles(geodetic, time).elevation);
  const moon = sample(noon, (time) => moonLookAngles(geodetic, time).elevation);

  const sunset = findCrossing(sun, SUNSET_ELEVATION, 'down', noon);
  const darkFrom = findCrossing(sun, darkBelow, 'down', sunset ?? noon);
  const darkUntil = darkFrom === null ? null : findCrossing(sun, darkBelow, 'up', darkFrom);
  const sunrise = findCrossing(sun, SUNSET_ELEVATION, 'up', darkUntil ?? sunset ?? noon);

  return { sunset, darkFrom, darkUntil, sunrise, moonUp: intervalsAbove(moon, 0) };
}
