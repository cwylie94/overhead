import {
  applyOffset,
  calibrationOffset,
  canCalibrateOn,
  isPlausibleOffset,
  MAX_CALIBRATION_OFFSET,
} from '../calibration';

describe('calibrationOffset', () => {
  describe('given a reading 8° west of and 2° above the Moon', () => {
    test('then the offset is how far the compass reading is from the Moon', () => {
      expect(
        calibrationOffset({ azimuth: 130, elevation: 32 }, { azimuth: 122, elevation: 34 }),
      ).toEqual({ azimuth: 8, elevation: -2 });
    });
  });

  describe('given the Moon just east of north and the reading just west of it', () => {
    test('then the offset takes the short way round through north', () => {
      expect(
        calibrationOffset({ azimuth: 5, elevation: 20 }, { azimuth: 355, elevation: 20 }),
      ).toEqual({ azimuth: 10, elevation: 0 });
    });
  });
});

describe('applyOffset', () => {
  describe('given the offset from calibrating on the Moon', () => {
    const moon = { azimuth: 3, elevation: 40 };
    const reading = { azimuth: 351, elevation: 43 };

    test('then a later reading is corrected so the Moon lands where it really is', () => {
      const corrected = applyOffset(reading, calibrationOffset(moon, reading));

      expect(corrected.azimuth).toBeCloseTo(3, 9);
      expect(corrected.elevation).toBeCloseTo(40, 9);
    });
  });

  describe('given an offset that would lift a reading past the zenith', () => {
    test('then the corrected elevation stays inside the sky', () => {
      expect(
        applyOffset({ azimuth: 10, elevation: 88 }, { azimuth: 0, elevation: 5 }).elevation,
      ).toBe(90);
    });
  });
});

describe('isPlausibleOffset', () => {
  describe('given an offset within the limit', () => {
    test.each([
      { azimuth: 12, elevation: -3 },
      { azimuth: MAX_CALIBRATION_OFFSET, elevation: 0 },
    ])('then $azimuth° by $elevation° is plausible', (offset) => {
      expect(isPlausibleOffset(offset)).toBe(true);
    });
  });

  describe('given an offset beyond the limit', () => {
    test.each([
      { azimuth: 60, elevation: 0 },
      { azimuth: 0, elevation: -50 },
    ])('then $azimuth° by $elevation° is rejected', (offset) => {
      expect(isPlausibleOffset(offset)).toBe(false);
    });
  });
});

describe('canCalibrateOn', () => {
  describe('given no Moon', () => {
    test('then it can’t calibrate', () => {
      expect(canCalibrateOn(null)).toBe(false);
    });
  });

  describe('given the Moon below or just above the horizon', () => {
    test.each([
      { azimuth: 100, elevation: -4 },
      { azimuth: 100, elevation: 1 },
    ])('then it can’t calibrate on a Moon $elevation° up', (moon) => {
      expect(canCalibrateOn(moon)).toBe(false);
    });
  });

  describe('given the Moon well above the horizon', () => {
    test('then it can calibrate on it', () => {
      expect(canCalibrateOn({ azimuth: 100, elevation: 15 })).toBe(true);
    });
  });
});
