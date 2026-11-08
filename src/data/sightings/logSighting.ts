import { UUID_RANDOM_BYTES, uuidv7 } from '@/domain/uuid';

import type { Repositories } from '../repositories';
import type { Sighting } from '../schema';

export type SightingInput = {
  noradId: number;
  observedAt: number;
  verified: boolean;
  angleError: number | null;
};

export type SightingContext = {
  now: number;
  randomBytes(count: number): Uint8Array;
};

export function logSighting(
  repositories: Pick<Repositories, 'sightings'>,
  input: SightingInput,
  { now, randomBytes }: SightingContext,
): Sighting {
  const id = uuidv7(now, randomBytes(UUID_RANDOM_BYTES));
  return repositories.sightings.log({ id, ...input }, now);
}
