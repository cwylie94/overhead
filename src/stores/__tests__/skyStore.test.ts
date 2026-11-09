import { useSkyStore } from '../skyStore';

beforeEach(() => {
  useSkyStore.setState(useSkyStore.getInitialState());
});

describe('useSkyStore', () => {
  describe('given no satellite is selected', () => {
    describe('when the user selects a satellite', () => {
      beforeEach(() => {
        useSkyStore.getState().selectSatellite(25544);
      });

      test('then it is selected', () => {
        expect(useSkyStore.getState().selectedNoradId).toBe(25544);
      });
    });
  });

  describe('given a satellite is selected', () => {
    beforeEach(() => {
      useSkyStore.getState().selectSatellite(25544);
    });

    describe('when the selection is cleared', () => {
      beforeEach(() => {
        useSkyStore.getState().clearSelection();
      });

      test('then no satellite is selected', () => {
        expect(useSkyStore.getState().selectedNoradId).toBeNull();
      });
    });
  });

  describe('given legendary is the only rarity filtered', () => {
    beforeEach(() => {
      useSkyStore.getState().toggleRarity('legendary');
    });

    describe('when the user toggles rare', () => {
      beforeEach(() => {
        useSkyStore.getState().toggleRarity('rare');
      });

      test('then both rarities are filtered in the order they were added', () => {
        expect(useSkyStore.getState().rarityFilter).toEqual(['legendary', 'rare']);
      });
    });
  });

  describe('given legendary and rare are filtered', () => {
    beforeEach(() => {
      const { toggleRarity } = useSkyStore.getState();
      toggleRarity('legendary');
      toggleRarity('rare');
    });

    describe('when the user toggles legendary again', () => {
      beforeEach(() => {
        useSkyStore.getState().toggleRarity('legendary');
      });

      test('then only rare is left', () => {
        expect(useSkyStore.getState().rarityFilter).toEqual(['rare']);
      });
    });
  });

  describe('given common is filtered', () => {
    beforeEach(() => {
      useSkyStore.getState().toggleRarity('common');
    });

    describe('when the user clears the filters', () => {
      beforeEach(() => {
        useSkyStore.getState().clearFilters();
      });

      test('then no rarity is filtered', () => {
        expect(useSkyStore.getState().rarityFilter).toEqual([]);
      });
    });
  });

  describe('given the scrubber is at the present', () => {
    describe('when the user commits a scrubber time 45 minutes ahead', () => {
      beforeEach(() => {
        useSkyStore.getState().setTimeOffset(45 * 60_000);
      });

      test('then the time offset is 45 minutes', () => {
        expect(useSkyStore.getState().timeOffset).toBe(45 * 60_000);
      });
    });
  });

  describe('given the scrubber is 45 minutes ahead', () => {
    beforeEach(() => {
      useSkyStore.getState().setTimeOffset(45 * 60_000);
    });

    describe('when the user resets the time', () => {
      beforeEach(() => {
        useSkyStore.getState().resetTime();
      });

      test('then the time offset is back to zero', () => {
        expect(useSkyStore.getState().timeOffset).toBe(0);
      });
    });
  });
});
