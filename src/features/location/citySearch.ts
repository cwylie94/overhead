export type CityRow = readonly [
  name: string,
  country: string,
  latitude: number,
  longitude: number,
  population: number,
];

export type City = {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  population: number;
};

const DEFAULT_LIMIT = 30;
const COMBINING_MARKS = /[̀-ͯ]/g;

export function foldText(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase().trim();
}

function rank(name: string, query: string): number | null {
  if (name.startsWith(query)) {
    return 0;
  }
  if (name.split(/[\s-]+/).some((word) => word.startsWith(query))) {
    return 1;
  }
  return name.includes(query) ? 2 : null;
}

const foldedCache = new WeakMap<readonly CityRow[], (readonly [string, string])[]>();

function foldedRows(rows: readonly CityRow[]): (readonly [string, string])[] {
  let folded = foldedCache.get(rows);
  if (!folded) {
    folded = rows.map(([name, country]) => [foldText(name), foldText(country)] as const);
    foldedCache.set(rows, folded);
  }
  return folded;
}

export function searchCities(
  rows: readonly CityRow[],
  query: string,
  limit = DEFAULT_LIMIT,
): City[] {
  const [namePart = '', countryPart = ''] = foldText(query)
    .split(',')
    .map((part) => part.trim());
  if (namePart.length === 0) {
    return [];
  }

  const folded = foldedRows(rows);
  const matches: { row: CityRow; rank: number }[] = [];
  rows.forEach((row, index) => {
    const [name, country] = folded[index]!;
    const score = rank(name, namePart);
    if (score !== null && (countryPart === '' || country.startsWith(countryPart))) {
      matches.push({ row, rank: score });
    }
  });
  matches.sort((a, b) => a.rank - b.rank || b.row[4] - a.row[4]);

  return matches
    .slice(0, limit)
    .map(({ row: [name, country, latitude, longitude, population] }) => ({
      name,
      country,
      latitude,
      longitude,
      population,
    }));
}
