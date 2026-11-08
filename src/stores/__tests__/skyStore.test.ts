import { useSkyStore } from '../skyStore';

beforeEach(() => {
  useSkyStore.setState(useSkyStore.getInitialState());
});

describe('sky store', () => {
  test('selects and clears a satellite', () => {
    useSkyStore.getState().selectSatellite(25544);
    expect(useSkyStore.getState().selectedNoradId).toBe(25544);

    useSkyStore.getState().clearSelection();
    expect(useSkyStore.getState().selectedNoradId).toBeNull();
  });

  test('toggling a rarity adds it, toggling again removes it', () => {
    const { toggleRarity } = useSkyStore.getState();

    toggleRarity('legendary');
    toggleRarity('rare');
    expect(useSkyStore.getState().rarityFilter).toEqual(['legendary', 'rare']);

    toggleRarity('legendary');
    expect(useSkyStore.getState().rarityFilter).toEqual(['rare']);
  });

  test('clearing filters removes every rarity', () => {
    useSkyStore.getState().toggleRarity('common');
    useSkyStore.getState().clearFilters();

    expect(useSkyStore.getState().rarityFilter).toEqual([]);
  });

  test('commits and resets the scrubber time offset', () => {
    useSkyStore.getState().setTimeOffset(45 * 60_000);
    expect(useSkyStore.getState().timeOffset).toBe(45 * 60_000);

    useSkyStore.getState().resetTime();
    expect(useSkyStore.getState().timeOffset).toBe(0);
  });
});
