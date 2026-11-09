import { useAppData } from '@/data/AppDataContext';
import { useLiveQuery } from '@/data/liveQuery/useLiveQuery';
import { skyPassesQuery } from '@/data/queries';
import { useNow } from '@/environment/clock';
import { useSkyStore } from '@/stores/skyStore';

import type { SkyViewProps } from './SkyView';
import { TIMELINE_SPAN } from './timeline';

const MINUTE = 60_000;

export function useSky(): SkyViewProps {
  const { db } = useAppData();
  const now = useNow(1_000);
  const queryFrom = useNow(MINUTE);
  const selectedId = useSkyStore((sky) => sky.selectedNoradId);
  const selectSatellite = useSkyStore((sky) => sky.selectSatellite);
  const clearSelection = useSkyStore((sky) => sky.clearSelection);
  const timeOffset = useSkyStore((sky) => sky.timeOffset);
  const setTimeOffset = useSkyStore((sky) => sky.setTimeOffset);
  const { data: passes } = useLiveQuery(
    skyPassesQuery(db, queryFrom - 5 * MINUTE, queryFrom + TIMELINE_SPAN + 30 * MINUTE),
    [queryFrom],
  );

  return {
    passes,
    now,
    selectedId,
    timeOffset,
    onSelect: (noradId) => (noradId === null ? clearSelection() : selectSatellite(noradId)),
    onCommitOffset: setTimeOffset,
  };
}
