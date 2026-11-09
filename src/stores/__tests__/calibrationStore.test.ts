import { useCalibrationStore } from '../calibrationStore';

beforeEach(() => {
  useCalibrationStore.setState(useCalibrationStore.getInitialState());
});

describe('useCalibrationStore', () => {
  describe('given the store has just been created', () => {
    test('then it is uncalibrated', () => {
      expect(useCalibrationStore.getState()).toMatchObject({ offset: null, calibratedAt: null });
    });
  });

  describe('given the user has calibrated once', () => {
    beforeEach(() => {
      useCalibrationStore.getState().calibrate({ azimuth: 8, elevation: -2 }, 1_000);
    });

    describe('when the user calibrates again', () => {
      beforeEach(() => {
        useCalibrationStore.getState().calibrate({ azimuth: 6, elevation: -1 }, 2_000);
      });

      test('then it remembers the latest calibration and when it was made', () => {
        expect(useCalibrationStore.getState()).toMatchObject({
          offset: { azimuth: 6, elevation: -1 },
          calibratedAt: 2_000,
        });
      });
    });

    describe('when the calibration is cleared', () => {
      beforeEach(() => {
        useCalibrationStore.getState().clear();
      });

      test('then it has no offset', () => {
        expect(useCalibrationStore.getState().offset).toBeNull();
      });
    });
  });

  describe('given the calibration has been cleared', () => {
    let cleared: ReturnType<typeof useCalibrationStore.getState>;

    beforeEach(() => {
      useCalibrationStore.getState().calibrate({ azimuth: 8, elevation: -2 }, 1_000);
      useCalibrationStore.getState().clear();
      cleared = useCalibrationStore.getState();
    });

    describe('when it is cleared again', () => {
      beforeEach(() => {
        useCalibrationStore.getState().clear();
      });

      test('then nothing changes', () => {
        expect(useCalibrationStore.getState()).toBe(cleared);
      });
    });
  });
});
