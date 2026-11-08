import { parseTestLocation } from '../testLocation';

describe('parseTestLocation', () => {
  test('reads latitude and longitude', () => {
    expect(parseTestLocation('64.15, -21.94')).toEqual({
      latitude: 64.15,
      longitude: -21.94,
      altitude: 0,
    });
  });

  test.each([undefined, '', '64.15', 'north,south', '95,0', '0,200', '1,2,3'])(
    'ignores %p',
    (value) => {
      expect(parseTestLocation(value)).toBeNull();
    },
  );
});
