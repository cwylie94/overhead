import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { UpcomingPass } from '@/data/queries';
import type { CatchStatus } from '@/domain/catchMachine';
import { compassPoint } from '@/domain/compass';
import type { SkyPosition } from '@/domain/sky';
import type { CustomLocation } from '@/stores/settingsStore';
import { formatCountdown } from '@/translations/format';
import { Banner } from '@/ui/Banner';
import { Text } from '@/ui/Text';
import { colors, spacing, typography } from '@/ui/theme';

import { CalibrationControls } from './CalibrationControls';
import { CameraCatchView } from './CameraCatchView';
import { CatchButton } from './CatchButton';
import { CatchCanvas } from './CatchCanvas';
import { CaughtOverlay } from './CaughtOverlay';
import type { AimGesture } from './useAimGesture';
import type { CameraAim } from './useCameraAim';

export type CatchPhase = 'waiting' | 'notUp' | Exclude<CatchStatus, 'idle'>;

export type CatchSky = {
  time: SharedValue<number>;
  progress: SharedValue<number>;
  azimuth: SharedValue<number>;
  elevation: SharedValue<number>;
  roll: SharedValue<number>;
};

export type CatchViewProps = {
  pass: UpcomingPass;
  now: number;
  phase: CatchPhase;
  caught: { caughtAt: number; angleError: number } | null;
  look: SkyPosition | null;
  chosenLocation: CustomLocation | null;
  calibrate: boolean;
  manual: boolean;
  gesture: AimGesture;
  sky: CatchSky;
  aim: CameraAim;
  onDone(): void;
};

export function CatchView({
  pass,
  now,
  phase,
  caught,
  look,
  chosenLocation,
  calibrate,
  manual,
  gesture,
  sky,
  aim,
  onDone,
}: CatchViewProps) {
  const { t, i18n } = useTranslation(['catch', 'common']);
  const [size, setSize] = useState(0);
  const hidden = caught !== null && styles.hidden;
  const statusText =
    phase === 'waiting'
      ? t('status.waiting', { countdown: formatCountdown(pass.startAt, now, i18n.language) })
      : t(`status.${phase}`);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={[styles.chrome, hidden]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {t('title', { name: pass.name })}
          </Text>
          {look && (
            <Text style={styles.look}>
              {t('look', {
                direction: t(`common:compass.${compassPoint(look.azimuth)}`),
                degrees: Math.round(look.elevation),
              })}
            </Text>
          )}
          <Text style={styles.status}>{statusText}</Text>
        </View>

        {chosenLocation && (
          <Banner
            message={t('common:banners.chosenLocation', {
              name: chosenLocation.name,
              country: chosenLocation.country,
            })}
          />
        )}
        {calibrate && <Banner tone="warning" message={t('calibrate')} />}
      </View>
      <GestureDetector gesture={gesture}>
        {aim.cameraOn && aim.device ? (
          <View style={styles.camera}>
            {!caught && (
              <CameraCatchView
                device={aim.device}
                track={pass.track}
                startAt={pass.startAt}
                time={sky.time}
                azimuth={sky.azimuth}
                elevation={sky.elevation}
                roll={sky.roll}
                progress={sky.progress}
                moon={aim.moon}
                moonLabel={t('moon.label')}
              />
            )}
          </View>
        ) : (
          <View
            testID="catch-canvas"
            style={styles.canvas}
            onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout.width)}>
            {size > 0 && !caught && (
              <CatchCanvas
                size={size}
                track={pass.track}
                startAt={pass.startAt}
                time={sky.time}
                azimuth={sky.azimuth}
                elevation={sky.elevation}
                progress={sky.progress}
              />
            )}
          </View>
        )}
      </GestureDetector>
      <View style={[styles.chrome, hidden]}>
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
            <CatchButton
              label={aim.cameraOn ? t('camera.hide') : t('camera.show')}
              onPress={() => {
                aim.toggleCamera().catch(() => {});
              }}
            />
          ))}

        <CatchButton label={t('done')} onPress={onDone} />
      </View>

      {caught && (
        <CaughtOverlay
          pass={pass}
          caughtAt={caught.caughtAt}
          angleError={caught.angleError}
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
});
