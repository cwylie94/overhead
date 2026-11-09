import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/ui/theme';

import {
  advance,
  CAMERA_FRAMES,
  FIRST_POSITION,
  MOON,
  SCENE_BOX,
  sceneFor,
  settled,
  STEP_MS,
  type CameraFrame,
  type SceneBadge,
} from './cameraScenes';
import { CameraSky } from './CameraSky';

const percentAcross = (x: number) => `${(x / SCENE_BOX.width) * 100}%` as const;
const percentDown = (y: number) => `${(y / SCENE_BOX.height) * 100}%` as const;

const BADGE_COLOR: Readonly<Record<Exclude<SceneBadge, null>, string>> = {
  off: colors.warning,
  linedUp: colors.success,
  holding: colors.success,
  caught: colors.success,
};

export function CameraWalkthrough() {
  const { t } = useTranslation(['onboarding', 'catch']);
  const [position, setPosition] = useState(FIRST_POSITION);
  const [playing, setPlaying] = useState(true);
  const scene = sceneFor(position);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const timer = setInterval(() => setPosition(advance), STEP_MS);
    return () => clearInterval(timer);
  }, [playing]);

  const badge: Record<Exclude<SceneBadge, null>, string> = {
    off: t('camera.off'),
    linedUp: t('camera.linedUp'),
    holding: t('catch:status.locked'),
    caught: t('catch:status.caught'),
  };

  const show = (frame: CameraFrame) => {
    setPlaying(false);
    setPosition(settled(frame));
  };

  return (
    <View style={styles.container}>
      <View style={styles.camera}>
        <CameraSky scene={scene} />
        <Text
          style={[
            styles.moonLabel,
            { left: percentAcross(MOON.x - 30), top: percentDown(MOON.y + 28) },
          ]}>
          {t('catch:moon.label')}
        </Text>
        {scene.badge && (
          <Text style={[styles.badge, { color: BADGE_COLOR[scene.badge] }]}>
            {badge[scene.badge]}
          </Text>
        )}
        {scene.showSet && (
          <View style={styles.set}>
            <Text style={styles.setText}>{t('catch:moon.set')}</Text>
          </View>
        )}
      </View>
      <View style={styles.frames}>
        {CAMERA_FRAMES.map((frame, index) => {
          const active = frame === position.frame;
          return (
            <Pressable
              key={frame}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => show(frame)}
              style={[styles.frame, active && styles.frameActive]}>
              <Text style={[styles.frameText, active && styles.frameTextActive]}>
                {t('camera.frameLabel', {
                  number: index + 1,
                  name: t(`camera.frames.${frame}`),
                })}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.caption}>
        {t(`camera.captions.${position.frame}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  camera: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  moonLabel: {
    ...typography.label,
    fontWeight: '400',
    position: 'absolute',
    width: percentAcross(60),
    textAlign: 'center',
    color: colors.textMuted,
  },
  badge: {
    ...typography.label,
    position: 'absolute',
    top: spacing.sm,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  set: {
    position: 'absolute',
    bottom: spacing.sm,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
  },
  setText: {
    ...typography.label,
    color: colors.accent,
  },
  frames: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  frame: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  frameActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  frameText: {
    ...typography.label,
    fontWeight: '400',
    color: colors.textMuted,
  },
  frameTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  caption: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
    minHeight: typography.body.lineHeight * 3,
  },
});
