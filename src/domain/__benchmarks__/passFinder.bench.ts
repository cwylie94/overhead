import { propagate } from 'satellite.js';

import { findPasses } from '../passFinder';
import { london, orbits, skyfield } from '../testing/skyfieldFixture';

jest.mock('satellite.js', () => {
  const actual = jest.requireActual<typeof import('satellite.js')>('satellite.js');
  return { ...actual, propagate: jest.fn(actual.propagate) };
});

const NIGHT = 16 * 60 * 60 * 1_000;
const propagations = propagate as jest.MockedFunction<typeof propagate>;

test('pass finding for every satellite over one night', () => {
  const search = {
    observer: london,
    from: skyfield.window.start,
    to: skyfield.window.start + NIGHT,
    minElevation: 10,
  };

  findPasses([...orbits.values()][0]!, search);
  propagations.mockClear();

  const started = performance.now();
  const passes = [...orbits.values()].flatMap((orbit) => findPasses(orbit, search));
  const elapsed = performance.now() - started;

  console.log(
    JSON.stringify({
      satellites: orbits.size,
      passes: passes.length,
      visible: passes.filter((pass) => pass.visible.length > 0).length,
      propagations: propagations.mock.calls.length,
      milliseconds: Math.round(elapsed),
    }),
  );
});
