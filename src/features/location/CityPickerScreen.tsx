import { router } from 'expo-router';
import { useDeferredValue, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CITIES } from '@/data/cities';
import { searchCities } from '@/data/cities/citySearch';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors } from '@/ui/theme';

import { CityPicker } from './CityPicker';

export function CityPickerScreen() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const results = useMemo(() => searchCities(CITIES, deferredQuery), [deferredQuery]);
  const setCustomLocation = useSettingsStore((settings) => settings.setCustomLocation);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <CityPicker
        query={query}
        results={results}
        onChangeQuery={setQuery}
        onSelect={({ name, country, latitude, longitude }) => {
          setCustomLocation({ name, country, latitude, longitude });
          router.back();
        }}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
