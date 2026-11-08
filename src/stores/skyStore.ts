import { create } from 'zustand';

import type { Rarity } from '@/domain/types';

type SkyState = {
  selectedNoradId: number | null;
  rarityFilter: Rarity[];
  timeOffset: number;
};

type SkyActions = {
  selectSatellite(noradId: number): void;
  clearSelection(): void;
  toggleRarity(rarity: Rarity): void;
  clearFilters(): void;
  setTimeOffset(milliseconds: number): void;
  resetTime(): void;
};

export const useSkyStore = create<SkyState & SkyActions>()((set) => ({
  selectedNoradId: null,
  rarityFilter: [],
  timeOffset: 0,

  selectSatellite: (selectedNoradId) => set({ selectedNoradId }),
  clearSelection: () => set({ selectedNoradId: null }),
  toggleRarity: (rarity) =>
    set(({ rarityFilter }) => ({
      rarityFilter: rarityFilter.includes(rarity)
        ? rarityFilter.filter((r) => r !== rarity)
        : [...rarityFilter, rarity],
    })),
  clearFilters: () => set({ rarityFilter: [] }),
  setTimeOffset: (timeOffset) => set({ timeOffset }),
  resetTime: () => set({ timeOffset: 0 }),
}));
