import * as Location from 'expo-location';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AppState, Linking, Platform } from 'react-native';

import type { Observer } from '@/domain/observer';
import { useSettingsStore } from '@/stores/settingsStore';

export type LocationState =
  | { status: 'locating' }
  | { status: 'ready'; observer: Observer }
  | { status: 'denied'; canAskAgain: boolean };

type LocationContextValue = {
  state: LocationState;
  requestPermission(): Promise<void>;
  askPermission(): Promise<boolean>;
};

type Permission =
  { status: 'unknown' } | { status: 'granted' } | { status: 'denied'; canAskAgain: boolean };

const LAST_KNOWN_MAX_AGE = 6 * 60 * 60 * 1_000;
const METRES_PER_KM = 1_000;
// Android's balanced mode uses Wi-Fi and cell positioning only, which dark-sky sites don't have.
const FIX_ACCURACY =
  Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced;

const LocationContext = createContext<LocationContextValue>({
  state: { status: 'locating' },
  requestPermission: async () => {},
  askPermission: async () => false,
});

export function observerFromCoordinates(coords: Location.LocationObjectCoords): Observer {
  return {
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: (coords.altitude ?? 0) / METRES_PER_KM,
  };
}

export function locationState(cached: Observer | null, permission: Permission): LocationState {
  if (cached) {
    return { status: 'ready', observer: cached };
  }
  if (permission.status === 'denied') {
    return { status: 'denied', canAskAgain: permission.canAskAgain };
  }
  return { status: 'locating' };
}

type ProviderProps = { children: ReactNode };

function useDeviceLocation(enabled: boolean): LocationContextValue {
  const cached = useSettingsStore((settings) => settings.lastLocation);
  const mayPrompt = useSettingsStore((settings) => settings.onboardingComplete);
  const rememberLocation = useSettingsStore((settings) => settings.rememberLocation);
  const [permission, setPermission] = useState<Permission>({ status: 'unknown' });

  const refresh = useCallback(
    async (askIfUndetermined: boolean): Promise<Permission> => {
      let response = await Location.getForegroundPermissionsAsync();
      if (response.status === Location.PermissionStatus.UNDETERMINED && askIfUndetermined) {
        response = await Location.requestForegroundPermissionsAsync();
      }
      if (!response.granted) {
        return { status: 'denied', canAskAgain: response.canAskAgain };
      }

      const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE });
      if (lastKnown) {
        rememberLocation(observerFromCoordinates(lastKnown.coords));
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: FIX_ACCURACY,
        mayShowUserSettingsDialog: false,
      }).catch(() => null);
      if (current) {
        rememberLocation(observerFromCoordinates(current.coords));
      }
      return { status: 'granted' };
    },
    [rememberLocation],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const apply = (askIfUndetermined: boolean) =>
      refresh(askIfUndetermined).then(setPermission, () => {});
    apply(mayPrompt);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        apply(false);
      }
    });
    return () => subscription.remove();
  }, [enabled, mayPrompt, refresh]);

  const ask = useCallback(async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    refresh(false).then(setPermission, () => {});
    return response;
  }, [refresh]);

  const requestPermission = useCallback(async () => {
    const response = await ask();
    if (!response.granted && !response.canAskAgain) {
      await Linking.openSettings();
    }
  }, [ask]);

  const askPermission = useCallback(async () => (await ask()).granted, [ask]);

  return useMemo(
    () => ({ state: locationState(cached, permission), requestPermission, askPermission }),
    [cached, permission, requestPermission, askPermission],
  );
}

type LocationProviderProps = ProviderProps & { fixed: Observer | null };

const NO_PERMISSION_NEEDED = async () => {};

export function LocationProvider({ fixed, children }: LocationProviderProps) {
  const device = useDeviceLocation(fixed === null);
  const value = useMemo<LocationContextValue>(
    () =>
      fixed
        ? {
            state: { status: 'ready', observer: fixed },
            requestPermission: NO_PERMISSION_NEEDED,
            askPermission: device.askPermission,
          }
        : device,
    [fixed, device],
  );
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

type FixedLocationProviderProps = ProviderProps & { observer: Observer };

export function FixedLocationProvider({ observer, children }: FixedLocationProviderProps) {
  return <LocationProvider fixed={observer}>{children}</LocationProvider>;
}

export function useLocation(): LocationContextValue {
  return useContext(LocationContext);
}
