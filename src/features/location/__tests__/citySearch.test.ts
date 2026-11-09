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

const { CITIES } = jest.requireActual<typeof import('@/data/cities')>('@/data/cities');

const names = (query: string) =>
  searchCities(rows, query).map((city) => `${city.name}, ${city.country}`);

describe('foldText', () => {
  describe('given text with capitals and accents', () => {
    test.each([
      { text: 'Reykjavík', folded: 'reykjavik' },
      { text: 'SÃO Paulo', folded: 'sao paulo' },
    ])('then $text folds to $folded', ({ text, folded }) => {
      expect(foldText(text)).toBe(folded);
    });
  });
});

describe('searchCities', () => {
  describe('given a blank query', () => {
    test('then it finds nothing', () => {
      expect(searchCities(rows, '  ')).toEqual([]);
    });
  });

  describe('given two cities with the same name', () => {
    test('then it puts the bigger city first', () => {
      expect(names('london')).toEqual(['London, United Kingdom', 'London, Canada']);
    });
  });

  describe('given names that start with the query and names with a later word that does', () => {
    test.each([
      {
        query: 'new',
        found: ['New York City, United States', 'Newcastle upon Tyne, United Kingdom'],
      },
      { query: 'york', found: ['New York City, United States'] },
    ])('then $query lists names that start with it above words inside them', ({ query, found }) => {
      expect(names(query)).toEqual(found);
    });
  });

  describe('given names with accents', () => {
    test.each([
      { query: 'reykjavik', found: ['Reykjavík, Iceland'] },
      { query: 'sao', found: ['São Paulo, Brazil'] },
    ])('then $query matches without them', ({ query, found }) => {
      expect(names(query)).toEqual(found);
    });
  });

  describe('given a query with a country after a comma', () => {
    test('then it narrows to that country', () => {
      expect(names('cambridge, united k')).toEqual(['Cambridge, United Kingdom']);
    });
  });

  describe('given a query that is only part of some names', () => {
    test.each([
      { query: 'lond', found: ['London, United Kingdom', 'Londrina, Brazil', 'London, Canada'] },
      { query: 'ondr', found: ['Londrina, Brazil'] },
    ])('then $query includes the partial matches after better ones', ({ query, found }) => {
      expect(names(query)).toEqual(found);
    });
  });

  describe('given a query that finds a city', () => {
    test('then it returns usable coordinates', () => {
      expect(searchCities(rows, 'reykjavik')[0]).toEqual({
        name: 'Reykjavík',
        country: 'Iceland',
        latitude: 64.135,
        longitude: -21.895,
        population: 118_918,
      });
    });
  });

  describe('given more matches than the limit', () => {
    test('then it stops at the limit', () => {
      expect(searchCities(rows, 'n', 2)).toHaveLength(2);
    });
  });

  describe('given the bundled city list', () => {
    test.each([
      { query: 'reykjavik', country: 'Iceland' },
      { query: 'edinburgh', country: 'United Kingdom' },
      { query: 'london', country: 'United Kingdom' },
    ])('then $query finds the place in $country first', ({ query, country }) => {
      expect(searchCities(CITIES, query)[0]?.country).toBe(country);
    });
  });
});

describe('CITIES', () => {
  describe('given every bundled city', () => {
    test('then its coordinates are on the globe', () => {
      for (const [, , latitude, longitude] of CITIES) {
        expect(Math.abs(latitude)).toBeLessThanOrEqual(90);
        expect(Math.abs(longitude)).toBeLessThanOrEqual(180);
      }
    });
  });
});
