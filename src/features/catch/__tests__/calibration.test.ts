import {
  applyOffset,
  calibrationOffset,
  canCalibrateOn,
  isPlausibleOffset,
  MAX_CALIBRATION_OFFSET,
} from '../calibration';

describe('calibrationOffset', () => {
  test('is how far the compass reading is from the Moon', () => {
    expect(
      calibrationOffset({ azimuth: 130, elevation: 32 }, { azimuth: 122, elevation: 34 }),
    ).toEqual({ azimuth: 8, elevation: -2 });
  });

  test('takes the short way round through north', () => {
    expect(
      calibrationOffset({ azimuth: 5, elevation: 20 }, { azimuth: 355, elevation: 20 }),
    ).toEqual({ azimuth: 10, elevation: 0 });
  });

  test('corrects later readings so the Moon lands where it really is', () => {
    const moon = { azimuth: 3, elevation: 40 };
    const reading = { azimuth: 351, elevation: 43 };
    const corrected = applyOffset(reading, calibrationOffset(moon, reading));

    expect(corrected.azimuth).toBeCloseTo(3, 9);
    expect(corrected.elevation).toBeCloseTo(40, 9);
  });

  test('keeps corrected elevations inside the sky', () => {
    expect(
      applyOffset({ azimuth: 10, elevation: 88 }, { azimuth: 0, elevation: 5 }).elevation,
    ).toBe(90);
  });
});

describe('isPlausibleOffset', () => {
  test.each([
    [{ azimuth: 12, elevation: -3 }, true],
    [{ azimuth: MAX_CALIBRATION_OFFSET, elevation: 0 }, true],
    [{ azimuth: 60, elevation: 0 }, false],
    [{ azimuth: 0, elevation: -50 }, false],
  ])('%o is %s', (offset, expected) => {
    expect(isPlausibleOffset(offset)).toBe(expected);
  });
});

describe('canCalibrateOn', () => {
  test.each([
    [null, false],
    [{ azimuth: 100, elevation: -4 }, false],
    [{ azimuth: 100, elevation: 1 }, false],
    [{ azimuth: 100, elevation: 15 }, true],
  ])('a Moon at %o: %s', (moon, expected) => {
    expect(canCalibrateOn(moon)).toBe(expected);
  });
});
