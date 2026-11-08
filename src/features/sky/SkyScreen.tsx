import { useTranslation } from 'react-i18next';

import { Screen } from '@/ui/Screen';

export function SkyScreen() {
  const { t } = useTranslation();

  return <Screen title={t('tabs.sky')} />;
}
