import { COLLECTION_SETS } from '../collectionSets';
import { SILHOUETTES, silhouetteFor } from '../silhouette';

describe('silhouetteFor', () => {
  describe('given a rocket body or debris, whatever its set', () => {
    test.each([
      { objectType: 'rocket_body', collectionSet: 'coldWarVeterans', expected: 'rocketStage' },
      { objectType: 'debris', collectionSet: 'spentStages', expected: 'debris' },
    ] as const)(
      'then a $objectType in $collectionSet is drawn as $expected',
      ({ objectType, collectionSet, expected }) => {
        expect(silhouetteFor({ objectType, collectionSet })).toBe(expected);
      },
    );
  });

  describe('given a payload', () => {
    test.each([
      { collectionSet: 'spaceStations', expected: 'station' },
      { collectionSet: 'observatories', expected: 'telescope' },
      { collectionSet: 'earthWatchers', expected: 'earthWatcher' },
      { collectionSet: 'coldWarVeterans', expected: 'payload' },
      { collectionSet: 'constellations', expected: 'constellation' },
      { collectionSet: 'spiesAndSecrets', expected: 'spy' },
    ] as const)(
      'then a payload in $collectionSet is drawn as $expected',
      ({ collectionSet, expected }) => {
        expect(silhouetteFor({ objectType: 'payload', collectionSet })).toBe(expected);
      },
    );
  });

  describe('given an object of unknown type', () => {
    test('then every set has a silhouette', () => {
      for (const collectionSet of COLLECTION_SETS) {
        expect(SILHOUETTES).toContain(silhouetteFor({ objectType: 'unknown', collectionSet }));
      }
    });
  });
});
