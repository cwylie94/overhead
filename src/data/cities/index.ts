import type { CityRow } from '@/features/location/citySearch';

import data from './cities.json';

export const CITIES = data.cities as unknown as readonly CityRow[];
