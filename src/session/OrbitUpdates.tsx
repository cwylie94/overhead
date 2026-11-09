import { useEffect } from 'react';

import { useAppSession } from './appSession';

export function OrbitUpdates() {
  const { features, orbitRefresher } = useAppSession();

  useEffect(
    () => (features.orbitUpdates ? orbitRefresher.start() : undefined),
    [features.orbitUpdates, orbitRefresher],
  );

  return null;
}
