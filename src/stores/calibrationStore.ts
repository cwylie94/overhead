import { create } from 'zustand';

import type { CalibrationOffset } from '@/domain/calibration';

type CalibrationState = {
  offset: CalibrationOffset | null;
  calibratedAt: number | null;
};

type CalibrationActions = {
  calibrate(offset: CalibrationOffset, at: number): void;
  clear(): void;
};

export const useCalibrationStore = create<CalibrationState & CalibrationActions>()((set) => ({
  offset: null,
  calibratedAt: null,
  calibrate: (offset, at) => set({ offset, calibratedAt: at }),
  clear: () =>
    set((state) => (state.offset === null ? state : { offset: null, calibratedAt: null })),
}));
