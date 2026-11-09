import '@/translations';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppDataProvider } from '@/data/AppDataContext';
import { ClockProvider, systemClock } from '@/environment/clock';
import { LocationProvider } from '@/environment/location';
import { configureNotificationHandler } from '@/reminders/reminders';
import { useAppSession } from '@/session/appSession';
import { DatabaseGate } from '@/session/DatabaseGate';
import { useFixedObserver } from '@/session/location';
import { OrbitUpdates } from '@/session/OrbitUpdates';
import { PassCacheProvider } from '@/session/PassCacheProvider';
import { MotionConfig } from '@/ui/motion';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    primary: colors.accent,
  },
};

export default function RootLayout() {
  const { data, demo } = useAppSession();
  const fixedLocation = useFixedObserver();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <MotionConfig />
        <AppDataProvider key={data.key} data={data}>
          <ClockProvider clock={demo?.clock ?? systemClock}>
            <LocationProvider fixed={fixedLocation}>
              <DatabaseGate>
                <PassCacheProvider runner={data.passCacheRunner}>
                  <OrbitUpdates />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                      name="onboarding"
                      options={{ gestureEnabled: false, animation: 'fade' }}
                    />
                    <Stack.Screen
                      name="catch/[passId]"
                      options={{ presentation: 'fullScreenModal' }}
                    />
                    <Stack.Screen name="location" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="satellite/[noradId]" options={{ presentation: 'modal' }} />
                  </Stack>
                </PassCacheProvider>
              </DatabaseGate>
            </LocationProvider>
          </ClockProvider>
        </AppDataProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
