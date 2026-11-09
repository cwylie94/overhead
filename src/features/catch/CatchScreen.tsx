import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppData } from '@/data/AppDataContext';
import { passWithSatelliteQuery, type UpcomingPass } from '@/data/queries';
import { useDemo } from '@/demo/session';
import { CATCH_HOLD_MS } from '@/domain/catchMachine';
import { catchWindow } from '@/domain/catchWindow';
import { compassPoint } from '@/domain/compass';
import { positionOnTrack } from '@/domain/sky';
import { useClock, useNow } from '@/environment/clock';
import { isEstimated, useLocation } from '@/environment/location';
import { formatCountdown } from '@/i18n/format';
import { useSettingsStore } from '@/stores/settingsStore';
import { Banner } from '@/ui/Banner';
import { ALWAYS_ANIMATE } from '@/ui/motion';
import { Text } from '@/ui/Text';
import { colors, radius, spacing, typography } from '@/ui/theme';

import { CalibrationControls } from './CalibrationControls';
import { CameraCatchView } from './CameraCatchView';
import { CatchCanvas, POINTS_PER_DEGREE } from './CatchCanvas';
import { CaughtOverlay } from './CaughtOverlay';
import { manualPointing } from './pointing';
import { useCameraAim } from './useCameraAim';
import { useCatchSession } from './useCatchSession';
import { usePointing } from './usePointing';

export function CatchScreen() {
  const { passId } = useLocalSearchParams<{ passId: string }>();
  const { db } = useAppData();
  const pass = useMemo(() => passWithSatelliteQuery(db, Number(passId)).get(), [db, passId]);
  const { t } = useTranslation('catch');
  const location = useLocation();
  const [openedOnEstimate] = useState(() => isEstimated(location.state));

  if (openedOnEstimate) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.status}>
          {isEstimated(location.state) ? t('location.finding') : t('location.found')}
        </Text>
        <DoneButton />
      </SafeAreaView>
    );
  }
  if (!pass) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.status}>{t('status.notUp')}</Text>
        <DoneButton />
      </SafeAreaView>
    );
  }
  return <CatchSession pass={pass} />;
}

function DoneButton() {
  const { t } = useTranslation('catch');
  return (
    <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => router.back()}>
      <Text style={styles.secondaryText}>{t('done')}</Text>
    </Pressable>
  );
}

function CatchSession({ pass }: { pass: UpcomingPass }) {
  const { t, i18n } = useTranslation(['catch', 'common']);
  const clock = useClock();
  const now = useNow(1_000);
  const [size, setSize] = useState(0);

  const startPosition = positionOnTrack(
    pass.track,
    Math.min(Math.max(clock.now(), pass.startAt), pass.endAt),
  );
  const demo = useDemo();
  const pointing = usePointing({
    azimuth: ((startPosition?.azimuth ?? 0) + 25) % 360,
    elevation: Math.max(0, (startPosition?.elevation ?? 30) - 15),
  });
  const session = useCatchSession(pass, pointing);
  const { machine } = session;
  const location = useLocation();
  const customLocation = useSettingsStore((settings) => settings.customLocation);
  const aim = useCameraAim(
    pointing,
    location.state.status === 'ready' ? location.state.observer : null,
    now,
    demo === null,
  );

  const time = useSharedValue(clock.now());
  const progress = useSharedValue(0);
  const dragStart = useSharedValue({ azimuth: 0, elevation: 0 });

  useEffect(() => {
    time.set(
      withTiming(now + 1_000, { duration: 1_000, easing: Easing.linear, ...ALWAYS_ANIMATE }),
    );
  }, [time, now]);

  useEffect(() => {
    if (machine.status === 'locked') {
      progress.set(
        withTiming(1, { duration: CATCH_HOLD_MS, easing: Easing.linear, ...ALWAYS_ANIMATE }),
      );
    } else if (machine.status === 'caught') {
      progress.set(1);
    } else {
      progress.set(withTiming(0, { duration: 150 }));
    }
  }, [machine.status, progress]);

  const manual = pointing.mode === 'manual';
  const caught = machine.status === 'caught';
  const { azimuth, elevation, setManual } = pointing;
  const { setTouching } = session;

  const hold = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      dragStart.set({ azimuth: azimuth.get(), elevation: elevation.get() });
      runOnJS(setTouching)(true);
    })
    .onUpdate((event) => {
      if (!manual) {
        return;
      }
      const position = manualPointing(
        dragStart.get(),
        event.translationX,
        event.translationY,
        POINTS_PER_DEGREE,
      );
      azimuth.set(position.azimuth);
      elevation.set(position.elevation);
      runOnJS(setManual)(position);
    })
    .onFinalize(() => {
      runOnJS(setTouching)(false);
    });

  const waiting = catchWindow(pass, now) === 'ready';
  const current = positionOnTrack(pass.track, Math.max(now, pass.startAt));
  const status =
    machine.status === 'idle' ? 'notUp' : machine.status === 'aiming' ? 'aiming' : machine.status;
  const statusText = waiting
    ? t('status.waiting', { countdown: formatCountdown(pass.startAt, now, i18n.language) })
    : t(`status.${status}`);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.chrome, caught && styles.hidden]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('title', { name: pass.name })}
          </Text>
          {current && (
            <Text style={styles.look}>
              {t('look', {
                direction: t(`common:compass.${compassPoint(current.azimuth)}`),
                degrees: Math.round(current.elevation),
              })}
            </Text>
          )}
          <Text style={styles.status}>{statusText}</Text>
        </View>

        {customLocation && !demo && (
          <Banner
            message={t('common:banners.chosenLocation', {
              name: customLocation.name,
              country: customLocation.country,
            })}
          />
        )}
        {pointing.calibrate && !manual && <Banner tone="warning" message={t('calibrate')} />}
      </View>
      <GestureDetector gesture={hold}>
        {aim.cameraOn && aim.device ? (
          <View style={styles.camera}>
            {!caught && (
              <CameraCatchView
                device={aim.device}
                track={pass.track}
                startAt={pass.startAt}
                time={time}
                azimuth={pointing.azimuth}
                elevation={pointing.elevation}
                roll={pointing.roll}
                progress={progress}
                moon={aim.moon}
                moonLabel={t('moon.label')}
              />
            )}
          </View>
        ) : (
          <View
            style={styles.canvas}
            onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout.width)}>
            {size > 0 && !caught && (
              <CatchCanvas
                size={size}
                track={pass.track}
                startAt={pass.startAt}
                time={time}
                azimuth={pointing.azimuth}
                elevation={pointing.elevation}
                progress={progress}
              />
            )}
          </View>
        )}
      </GestureDetector>
      <View style={[styles.chrome, caught && styles.hidden]}>
        <Text style={styles.hint}>{manual ? t('holdManual') : t('hold')}</Text>

        {aim.cameraOn && (
          <CalibrationControls
            calibrating={aim.calibrating}
            moonUp={aim.moonUp}
            calibratedAt={aim.calibratedAt}
            tooFar={aim.tooFar}
            now={now}
            onStart={aim.startCalibration}
            onSet={aim.setCalibration}
            onCancel={aim.cancelCalibration}
          />
        )}
        {aim.available &&
          (aim.denied ? (
            <Pressable accessibilityRole="button" onPress={aim.openSettings}>
              <Text style={styles.hint}>{t('camera.denied')}</Text>
              <Text style={[styles.hint, styles.link]}>{t('camera.openSettings')}</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => {
                aim.toggleCamera().catch(() => {});
              }}>
              <Text style={styles.secondaryText}>
                {aim.cameraOn ? t('camera.hide') : t('camera.show')}
              </Text>
            </Pressable>
          ))}

        <DoneButton />
      </View>

      {machine.status === 'caught' && (
        <CaughtOverlay
          pass={pass}
          caughtAt={machine.caughtAt}
          angleError={machine.angleError}
          now={now}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chrome: {
    gap: spacing.md,
  },
  hidden: {
    opacity: 0,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  look: {
    ...typography.body,
    color: colors.accent,
  },
  status: {
    ...typography.body,
    color: colors.textMuted,
  },
  canvas: {
    width: '100%',
    aspectRatio: 1,
  },
  camera: {
    flex: 1,
  },
  link: {
    color: colors.accent,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  secondary: {
    alignSelf: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  secondaryText: {
    ...typography.heading,
    color: colors.text,
  },
});
