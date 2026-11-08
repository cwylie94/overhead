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
import { AppState, Linking } from 'react-native';

import type { Observer } from '@/domain/observer';
import { useSettingsStore } from '@/stores/settingsStore';

export type LocationState =
  | { status: 'locating' }
  | { status: 'ready'; observer: Observer }
  | { status: 'denied'; canAskAgain: boolean };

type LocationContextValue = {
  state: LocationState;
  requestPermission(): Promise<void>;
};

type Permission =
  { status: 'unknown' } | { status: 'granted' } | { status: 'denied'; canAskAgain: boolean };

const LAST_KNOWN_MAX_AGE = 6 * 60 * 60 * 1_000;
const METRES_PER_KM = 1_000;

const LocationContext = createContext<LocationContextValue>({
  state: { status: 'locating' },
  requestPermission: async () => {},
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
        accuracy: Location.Accuracy.Balanced,
      });
      rememberLocation(observerFromCoordinates(current.coords));
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
    apply(true);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        apply(false);
      }
    });
    return () => subscription.remove();
  }, [enabled, refresh]);

  const requestPermission = useCallback(async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    if (!response.granted && !response.canAskAgain) {
      await Linking.openSettings();
      return;
    }
    setPermission(await refresh(false));
  }, [refresh]);

  return useMemo(
    () => ({ state: locationState(cached, permission), requestPermission }),
    [cached, permission, requestPermission],
  );
}

type LocationProviderProps = ProviderProps & { fixed: Observer | null };

const NO_PERMISSION_NEEDED = async () => {};

export function LocationProvider({ fixed, children }: LocationProviderProps) {
  const device = useDeviceLocation(fixed === null);
  const value = useMemo<LocationContextValue>(
    () =>
      fixed
        ? { state: { status: 'ready', observer: fixed }, requestPermission: NO_PERMISSION_NEEDED }
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
