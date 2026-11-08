import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const GEONAMES = 'https://download.geonames.org/export/dump';
const MIN_POPULATION = 100_000;
const CAPITAL = 'PPLC';
const OUTPUT = path.resolve(import.meta.dirname, '../src/data/cities/cities.json');

type City = [
  name: string,
  country: string,
  latitude: number,
  longitude: number,
  population: number,
];

async function download(url: string, file: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
}

function rows(text: string): string[][] {
  return text
    .split('\n')
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.split('\t'));
}

function round(value: string): number {
  return Math.round(Number(value) * 1000) / 1000;
}

async function main(): Promise<void> {
  const work = await mkdtemp(path.join(tmpdir(), 'geonames-'));
  try {
    const zip = path.join(work, 'cities15000.zip');
    await download(`${GEONAMES}/cities15000.zip`, zip);
    const cities = execFileSync('unzip', ['-p', zip, 'cities15000.txt'], {
      maxBuffer: 64 * 1024 * 1024,
    }).toString('utf8');

    const countryResponse = await fetch(`${GEONAMES}/countryInfo.txt`);
    if (!countryResponse.ok) {
      throw new Error(`countryInfo.txt returned HTTP ${countryResponse.status}`);
    }
    const countries = new Map(rows(await countryResponse.text()).map((row) => [row[0]!, row[4]!]));

    const picked: City[] = rows(cities)
      .filter((row) => Number(row[14]) >= MIN_POPULATION || row[7] === CAPITAL)
      .map((row) => [
        row[1]!,
        countries.get(row[8]!) ?? row[8]!,
        round(row[4]!),
        round(row[5]!),
        Number(row[14]),
      ]);
    picked.sort((a, b) => b[4] - a[4]);

    await mkdir(path.dirname(OUTPUT), { recursive: true });
    await writeFile(
      OUTPUT,
      `${JSON.stringify({ source: 'GeoNames cities15000, CC BY 4.0', fetchedAt: new Date().toISOString(), cities: picked })}\n`,
    );
    console.log(`wrote ${picked.length} cities to ${path.relative(process.cwd(), OUTPUT)}`);
  } finally {
    await rm(work, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
