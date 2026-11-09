import { Screen } from '@/ui/Screen';

import { TonightView } from './TonightView';
import { useTonight } from './useTonight';

export function TonightScreen() {
  const tonight = useTonight();

  return (
    <Screen>
      <TonightView {...tonight} />
    </Screen>
  );
}
