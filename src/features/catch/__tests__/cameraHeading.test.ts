import { cameraAzimuth } from '../cameraHeading';
import { readings } from '../testing/pose';

const NO_READING = { x: 0, y: 0, z: 0 };

function angleBetween(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

function azimuthInPose(azimuth: number, elevation: number, roll?: number) {
  const { gravity, magnetic } = readings(azimuth, elevation, roll);
  return cameraAzimuth(gravity, magnetic);
}

describe('cameraAzimuth', () => {
  describe('given the back camera pointing in a known direction', () => {
    test.each([
      { azimuth: 0, elevation: 0 },
      { azimuth: 90, elevation: 10 },
      { azimuth: 180, elevation: 46 },
      { azimuth: 225, elevation: 30 },
      { azimuth: 300, elevation: 75 },
      { azimuth: 45, elevation: -20 },
    ])(
      'then it finds the camera at $azimuth° azimuth, $elevation° up',
      ({ azimuth, elevation }) => {
        expect(angleBetween(azimuthInPose(azimuth, elevation)!, azimuth)).toBeLessThan(1e-6);
      },
    );
  });

  describe('given the phone tilted back so its top points north and the camera south', () => {
    test('then it follows the camera, not the top of the phone', () => {
      expect(angleBetween(azimuthInPose(180, 46)!, 0)).toBeGreaterThan(170);
    });
  });

  describe('given the phone rolled around the camera', () => {
    test('then the roll doesn’t change the azimuth', () => {
      expect(angleBetween(azimuthInPose(120, 35, 70)!, 120)).toBeLessThan(1e-6);
    });
  });

  describe('given the camera at the zenith', () => {
    test('then it has no azimuth', () => {
      expect(azimuthInPose(0, 89)).toBeNull();
    });
  });

  describe('given no gravity reading', () => {
    test('then it has no azimuth', () => {
      expect(cameraAzimuth(NO_READING, readings(0, 0).magnetic)).toBeNull();
    });
  });

  describe('given no magnetic reading', () => {
    test('then it has no azimuth', () => {
      expect(cameraAzimuth(readings(0, 0).gravity, NO_READING)).toBeNull();
    });
  });
});
