import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAppData } from '@/data/AppDataContext';
import { passWithSatelliteQuery, type UpcomingPass } from '@/data/queries';
import { isEstimated, useLocation } from '@/environment/location';

import { CatchMessage } from './CatchMessage';
import { CatchView } from './CatchView';
import { useCatch } from './useCatch';

const goBack = () => router.back();

export function CatchScreen() {
  const { passId } = useLocalSearchParams<{ passId: string }>();
  const { db } = useAppData();
  const pass = useMemo(() => passWithSatelliteQuery(db, Number(passId)).get(), [db, passId]);
  const { t } = useTranslation('catch');
  const location = useLocation();
  const [openedOnEstimate] = useState(() => isEstimated(location.state));

  if (openedOnEstimate) {
    return (
      <CatchMessage
        message={isEstimated(location.state) ? t('location.finding') : t('location.found')}
        onDone={goBack}
      />
    );
  }
  if (!pass) {
    return <CatchMessage message={t('status.notUp')} onDone={goBack} />;
  }
  return <CatchSession pass={pass} />;
}

function CatchSession({ pass }: { pass: UpcomingPass }) {
  return <CatchView {...useCatch(pass)} onDone={goBack} />;
}
