import { useTranslation } from 'react-i18next';

import { Screen } from '@/ui/Screen';

import { TonightView } from './TonightView';
import { useTonight } from './useTonight';

export function TonightScreen() {
  const { t } = useTranslation();
  const tonight = useTonight();

  return (
    <Screen title={t('tabs.tonight')}>
      <TonightView {...tonight} />
    </Screen>
  );
}
