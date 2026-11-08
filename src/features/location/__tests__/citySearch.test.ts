import { foldText, searchCities, type CityRow } from '../citySearch';

const rows: CityRow[] = [
  ['London', 'United Kingdom', 51.509, -0.126, 8_961_989],
  ['London', 'Canada', 42.984, -81.246, 346_765],
  ['Londrina', 'Brazil', -23.31, -51.163, 506_701],
  ['New York City', 'United States', 40.714, -74.006, 8_804_190],
  ['Reykjavík', 'Iceland', 64.135, -21.895, 118_918],
  ['Cambridge', 'United States', 42.375, -71.106, 105_162],
  ['Cambridge', 'United Kingdom', 52.2, 0.117, 145_818],
  ['São Paulo', 'Brazil', -23.548, -46.636, 12_400_232],
  ['Newcastle upon Tyne', 'United Kingdom', 54.973, -1.614, 192_382],
];

const names = (query: string) =>
  searchCities(rows, query).map((city) => `${city.name}, ${city.country}`);

describe('foldText', () => {
  test('ignores case and accents', () => {
    expect(foldText('Reykjavík')).toBe('reykjavik');
    expect(foldText('SÃO Paulo')).toBe('sao paulo');
  });
});

describe('searchCities', () => {
  test('finds nothing for an empty query', () => {
    expect(searchCities(rows, '  ')).toEqual([]);
  });

  test('puts bigger cities first among equal matches', () => {
    expect(names('london')).toEqual(['London, United Kingdom', 'London, Canada']);
  });

  test('ranks names that start with the query above words inside them', () => {
    expect(names('new')).toEqual([
      'New York City, United States',
      'Newcastle upon Tyne, United Kingdom',
    ]);
    expect(names('york')).toEqual(['New York City, United States']);
  });

  test('matches without accents', () => {
    expect(names('reykjavik')).toEqual(['Reykjavík, Iceland']);
    expect(names('sao')).toEqual(['São Paulo, Brazil']);
  });

  test('narrows by country after a comma', () => {
    expect(names('cambridge, united k')).toEqual(['Cambridge, United Kingdom']);
  });

  test('includes partial matches after better ones', () => {
    expect(names('lond')).toEqual(['London, United Kingdom', 'Londrina, Brazil', 'London, Canada']);
    expect(names('ondr')).toEqual(['Londrina, Brazil']);
  });

  test('returns usable coordinates', () => {
    expect(searchCities(rows, 'reykjavik')[0]).toEqual({
      name: 'Reykjavík',
      country: 'Iceland',
      latitude: 64.135,
      longitude: -21.895,
      population: 118_918,
    });
  });

  test('stops at the limit', () => {
    expect(searchCities(rows, 'n', 2)).toHaveLength(2);
  });
});

describe('the bundled city list', () => {
  const { CITIES } = jest.requireActual<typeof import('@/data/cities')>('@/data/cities');

  test('finds places people are likely to look for', () => {
    expect(searchCities(CITIES, 'reykjavik')[0]?.country).toBe('Iceland');
    expect(searchCities(CITIES, 'edinburgh')[0]?.country).toBe('United Kingdom');
    expect(searchCities(CITIES, 'london')[0]?.country).toBe('United Kingdom');
  });

  test('has sensible coordinates for every city', () => {
    for (const [, , latitude, longitude] of CITIES) {
      expect(Math.abs(latitude)).toBeLessThanOrEqual(90);
      expect(Math.abs(longitude)).toBeLessThanOrEqual(180);
    }
  });
});
