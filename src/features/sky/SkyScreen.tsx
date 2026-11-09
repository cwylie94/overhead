import { useTranslation } from 'react-i18next';

import { Screen } from '@/ui/Screen';

import { SkyView } from './SkyView';
import { useSky } from './useSky';

export function SkyScreen() {
  const { t } = useTranslation('common');
  const sky = useSky();

  return (
    <Screen title={t('tabs.sky')}>
      <SkyView {...sky} />
    </Screen>
  );
}
