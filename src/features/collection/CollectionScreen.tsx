import { useTranslation } from 'react-i18next';

import { Screen } from '@/ui/Screen';

import { CollectionView } from './CollectionView';
import { useCollectionTab } from './useCollectionTab';

export function CollectionScreen() {
  const { t } = useTranslation();
  const collection = useCollectionTab();

  return (
    <Screen title={t('tabs.collection')}>
      <CollectionView {...collection} />
    </Screen>
  );
}
