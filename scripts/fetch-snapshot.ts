import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const CELESTRAK = 'https://celestrak.org';
const GROUPS = ['visual', 'stations'] as const;
const SATCAT_FIELDS = [
  'OBJECT_NAME',
  'OBJECT_ID',
  'NORAD_CAT_ID',
  'OBJECT_TYPE',
  'OWNER',
  'LAUNCH_DATE',
] as const;
const OUTPUT_DIR = path.resolve(import.meta.dirname, '../src/data/snapshot');

type Record = { NORAD_CAT_ID: number; [field: string]: unknown };

async function getJson(url: string): Promise<Record[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return (await response.json()) as Record[];
}

function byNoradId(a: Record, b: Record): number {
  return a.NORAD_CAT_ID - b.NORAD_CAT_ID;
}

async function writeJson(name: string, value: unknown): Promise<void> {
  await writeFile(path.join(OUTPUT_DIR, name), `${JSON.stringify(value, null, 2)}\n`);
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const catalogue = new Map<number, Record>();
  const counts: { [group: string]: number } = {};

  for (const group of GROUPS) {
    const orbits = await getJson(`${CELESTRAK}/NORAD/elements/gp.php?GROUP=${group}&FORMAT=JSON`);
    const satcat = await getJson(`${CELESTRAK}/satcat/records.php?GROUP=${group}&FORMAT=JSON`);
    const ids = new Set(orbits.map((orbit) => orbit.NORAD_CAT_ID));

    for (const record of satcat) {
      if (ids.has(record.NORAD_CAT_ID)) {
        const picked = Object.fromEntries(SATCAT_FIELDS.map((field) => [field, record[field]]));
        catalogue.set(record.NORAD_CAT_ID, picked as Record);
      }
    }

    const missing = [...ids].filter((id) => !catalogue.has(id));
    if (missing.length > 0) {
      throw new Error(`SATCAT has no record for ${group} objects ${missing.join(', ')}`);
    }

    await writeJson(`${group}.json`, orbits.sort(byNoradId));
    counts[group] = orbits.length;
  }

  await writeJson('satcat.json', [...catalogue.values()].sort(byNoradId));
  await writeJson('meta.json', { fetchedAt: new Date().toISOString(), counts });

  console.log(`Snapshot written to ${path.relative(process.cwd(), OUTPUT_DIR)}`, counts);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
