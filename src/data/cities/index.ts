import data from './cities.json';
import type { CityRow } from './citySearch';

export const CITIES = data.cities as unknown as readonly CityRow[];
