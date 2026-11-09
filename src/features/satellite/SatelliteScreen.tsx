import { useLocalSearchParams } from 'expo-router';

import { SatelliteView } from './SatelliteView';
import { useSatellite } from './useSatellite';

export function SatelliteScreen() {
  const { noradId } = useLocalSearchParams<{ noradId: string }>();
  const satellite = useSatellite(Number(noradId));
  return satellite && <SatelliteView {...satellite} />;
}
