import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import type { UpcomingPass } from '@/data/queries';
import { Text } from '@/ui/Text';
import { colors, radius, spacing, typography } from '@/ui/theme';

import { SelectedSatellite } from './SelectedSatellite';
import { SkyDome } from './SkyDome';
import { clockStyleFor } from './timeline';
import { TimelineScrubber } from './TimelineScrubber';
import { useCompassHeading } from './useCompassHeading';
import { useSkyTime } from './useSkyTime';

const NOW_BUTTON_WIDTH = 64;

export type SkyViewProps = {
  passes: UpcomingPass[];
  now: number;
  selectedId: number | null;
  timeOffset: number;
  onSelect(noradId: number | null): void;
  onCommitOffset(offset: number): void;
};

export function SkyView({
  passes,
  now,
  selectedId,
  timeOffset,
  onSelect,
  onCommitOffset,
}: SkyViewProps) {
  const { t, i18n } = useTranslation(['sky', 'common']);
  const [width, setWidth] = useState(0);
  const [compass, setCompass] = useState(false);
  const { base, offset, time, backToNow } = useSkyTime(now, timeOffset);
  const rotation = useCompassHeading(compass);
  const clockStyle = useMemo(() => clockStyleFor(i18n.language), [i18n.language]);

  const labels = {
    N: t('common:compass.N'),
    E: t('common:compass.E'),
    S: t('common:compass.S'),
    W: t('common:compass.W'),
  };

  return (
    <View
      testID="sky"
      style={styles.content}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <SkyDome
            size={width}
            passes={passes}
            time={time}
            rotation={rotation}
            selectedId={selectedId}
            labels={labels}
            onSelect={onSelect}
          />
          <View style={styles.timelineRow}>
            <TimelineScrubber
              width={width - NOW_BUTTON_WIDTH - spacing.sm}
              base={base}
              offset={offset}
              clockStyle={clockStyle}
              onCommit={onCommitOffset}
            />
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={() => {
                backToNow();
                onCommitOffset(0);
              }}>
              <Text style={styles.buttonText} numberOfLines={1} adjustsFontSizeToFit>
                {t('now')}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: compass }}
            accessibilityLabel={t('compass')}
            style={[styles.toggle, compass && styles.toggleOn]}
            onPress={() => setCompass((on) => !on)}>
            <Text style={[styles.toggleText, compass && styles.toggleTextOn]}>
              {compass ? t('compassOn') : t('compass')}
            </Text>
          </Pressable>
          {passes.length === 0 ? (
            <Text style={styles.empty}>{t('empty')}</Text>
          ) : (
            <SelectedSatellite
              passes={passes}
              selectedId={selectedId}
              time={now + timeOffset}
              live={timeOffset === 0}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    gap: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    width: NOW_BUTTON_WIDTH,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
  },
  buttonText: {
    ...typography.label,
    color: colors.text,
  },
  toggle: {
    alignSelf: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  toggleOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  toggleText: {
    ...typography.label,
    color: colors.text,
  },
  toggleTextOn: {
    color: colors.background,
  },
  empty: {
    ...typography.body,
    color: colors.textMuted,
  },
});
