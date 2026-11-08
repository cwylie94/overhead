import '@/i18n';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppDataProvider } from '@/data/AppDataContext';
import { DatabaseGate } from '@/data/DatabaseGate';
import { PassCacheProvider } from '@/data/passCache/PassCacheScheduler';
import { useAppSession, type DemoEnvironment } from '@/demo/session';
import { ClockProvider, systemClock } from '@/environment/clock';
import { DeviceLocationProvider, FixedLocationProvider } from '@/environment/location';
import { configureNotificationHandler } from '@/features/tonight/reminders';
import { SyncProvider } from '@/sync/SyncProvider';
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

function LocationProvider({
  demo,
  children,
}: {
  demo: DemoEnvironment | null;
  children: ReactNode;
}) {
  return demo ? (
    <FixedLocationProvider observer={demo.observer}>{children}</FixedLocationProvider>
  ) : (
    <DeviceLocationProvider>{children}</DeviceLocationProvider>
  );
}

export default function RootLayout() {
  const { data, demo } = useAppSession();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <MotionConfig />
        <AppDataProvider key={data.key} data={data}>
          <ClockProvider clock={demo?.clock ?? systemClock}>
            <LocationProvider demo={demo}>
              <DatabaseGate>
                <PassCacheProvider runner={data.passCacheRunner}>
                  <SyncProvider enabled={demo === null}>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="(tabs)" />
                      <Stack.Screen
                        name="catch/[passId]"
                        options={{ presentation: 'fullScreenModal' }}
                      />
                      <Stack.Screen
                        name="satellite/[noradId]"
                        options={{ presentation: 'modal' }}
                      />
                    </Stack>
                  </SyncProvider>
                </PassCacheProvider>
              </DatabaseGate>
            </LocationProvider>
          </ClockProvider>
        </AppDataProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
