import { COLLECTION_SETS } from '../collectionSets';
import { SILHOUETTES, silhouetteFor } from '../silhouette';

describe('silhouetteFor', () => {
  test('rocket bodies and debris look like what they are, whatever their set', () => {
    expect(silhouetteFor({ objectType: 'rocket_body', collectionSet: 'coldWarVeterans' })).toBe(
      'rocketStage',
    );
    expect(silhouetteFor({ objectType: 'debris', collectionSet: 'spentStages' })).toBe('debris');
  });

  test.each([
    ['spaceStations', 'station'],
    ['observatories', 'telescope'],
    ['earthWatchers', 'earthWatcher'],
    ['coldWarVeterans', 'payload'],
    ['constellations', 'constellation'],
    ['spiesAndSecrets', 'spy'],
  ] as const)('a payload in %s is drawn as a %s', (collectionSet, expected) => {
    expect(silhouetteFor({ objectType: 'payload', collectionSet })).toBe(expected);
  });

  test('every set has a silhouette', () => {
    for (const collectionSet of COLLECTION_SETS) {
      expect(SILHOUETTES).toContain(silhouetteFor({ objectType: 'unknown', collectionSet }));
    }
  });
});
