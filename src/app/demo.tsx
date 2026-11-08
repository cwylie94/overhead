import { Redirect, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useSettingsStore } from '@/stores/settingsStore';

export default function DemoLink() {
  const { enabled } = useLocalSearchParams<{ enabled?: string }>();
  const turnOn = enabled !== '0';

  useEffect(() => {
    useSettingsStore.getState().setDemoMode(turnOn);
  }, [turnOn]);

  return <Redirect href="/" />;
}
