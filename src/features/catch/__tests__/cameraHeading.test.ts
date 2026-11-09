import { cameraAzimuth } from '../cameraHeading';
import { readings } from '../testing/pose';

function angleBetween(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

describe('cameraAzimuth', () => {
  test.each([
    [0, 0],
    [90, 10],
    [180, 46],
    [225, 30],
    [300, 75],
    [45, -20],
  ])('finds where the back camera points at %d° azimuth, %d° up', (azimuth, elevation) => {
    const { gravity, magnetic } = readings(azimuth, elevation);

    expect(angleBetween(cameraAzimuth(gravity, magnetic)!, azimuth)).toBeLessThan(1e-6);
  });

  test('follows the camera, not the top of the phone, when tilted back', () => {
    const { gravity, magnetic } = readings(180, 46);

    expect(angleBetween(cameraAzimuth(gravity, magnetic)!, 0)).toBeGreaterThan(170);
  });

  test('ignores how the phone is rolled around the camera', () => {
    const { gravity, magnetic } = readings(120, 35, 70);

    expect(angleBetween(cameraAzimuth(gravity, magnetic)!, 120)).toBeLessThan(1e-6);
  });

  test('has no azimuth with the camera at the zenith', () => {
    const { gravity, magnetic } = readings(0, 89);

    expect(cameraAzimuth(gravity, magnetic)).toBeNull();
  });

  test('has no azimuth without readings', () => {
    const none = { x: 0, y: 0, z: 0 };

    expect(cameraAzimuth(none, readings(0, 0).magnetic)).toBeNull();
    expect(cameraAzimuth(readings(0, 0).gravity, none)).toBeNull();
  });
});
