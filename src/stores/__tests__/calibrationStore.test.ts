import { useCalibrationStore } from '../calibrationStore';

beforeEach(() => {
  useCalibrationStore.setState(useCalibrationStore.getInitialState());
});

describe('calibration store', () => {
  test('starts uncalibrated', () => {
    expect(useCalibrationStore.getState()).toMatchObject({ offset: null, calibratedAt: null });
  });

  test('remembers the latest calibration and when it was made', () => {
    useCalibrationStore.getState().calibrate({ azimuth: 8, elevation: -2 }, 1_000);
    useCalibrationStore.getState().calibrate({ azimuth: 6, elevation: -1 }, 2_000);

    expect(useCalibrationStore.getState()).toMatchObject({
      offset: { azimuth: 6, elevation: -1 },
      calibratedAt: 2_000,
    });
  });

  test('clears, and clearing again changes nothing', () => {
    useCalibrationStore.getState().calibrate({ azimuth: 8, elevation: -2 }, 1_000);
    useCalibrationStore.getState().clear();
    const cleared = useCalibrationStore.getState();
    useCalibrationStore.getState().clear();

    expect(cleared.offset).toBeNull();
    expect(useCalibrationStore.getState()).toBe(cleared);
  });
});
