import '@/i18n';

import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DatabaseGate } from '@/data/DatabaseGate';
import { ClockProvider, systemClock } from '@/environment/clock';
import { DeviceLocationProvider } from '@/environment/location';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync();

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
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <ClockProvider clock={systemClock}>
          <DeviceLocationProvider>
            <DatabaseGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
              </Stack>
            </DatabaseGate>
          </DeviceLocationProvider>
        </ClockProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
