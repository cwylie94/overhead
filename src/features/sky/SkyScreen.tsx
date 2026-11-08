import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Easing, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import { db } from '@/data/client';
import { skyPassesQuery } from '@/data/queries';
import { useClock, useNow } from '@/environment/clock';
import { useSkyStore } from '@/stores/skyStore';
import { Screen } from '@/ui/Screen';
import { colors, radius, spacing, typography } from '@/ui/theme';

import { SelectedSatellite } from './SelectedSatellite';
import { SkyDome } from './SkyDome';
import { clockStyleFor, TIMELINE_SPAN } from './timeline';
import { TimelineScrubber } from './TimelineScrubber';
import { useCompassHeading } from './useCompassHeading';

const MINUTE = 60_000;
const NOW_BUTTON_WIDTH = 64;

export function SkyScreen() {
  const { t, i18n } = useTranslation(['sky', 'common']);
  const clock = useClock();
  const now = useNow(1_000);
  const queryFrom = useNow(MINUTE);
  const [width, setWidth] = useState(0);
  const [compass, setCompass] = useState(false);

  const selectedId = useSkyStore((sky) => sky.selectedNoradId);
  const selectSatellite = useSkyStore((sky) => sky.selectSatellite);
  const clearSelection = useSkyStore((sky) => sky.clearSelection);
  const committedOffset = useSkyStore((sky) => sky.timeOffset);
  const setTimeOffset = useSkyStore((sky) => sky.setTimeOffset);

  const { data: passes } = useLiveQuery(
    skyPassesQuery(db, queryFrom - 5 * MINUTE, queryFrom + TIMELINE_SPAN + 30 * MINUTE),
    [queryFrom],
  );

  const base = useSharedValue(clock.now());
  const offset = useSharedValue(committedOffset);
  const time = useDerivedValue(() => base.get() + offset.get());
  const rotation = useCompassHeading(compass);
  const clockStyle = useMemo(() => clockStyleFor(i18n.language), [i18n.language]);

  useEffect(() => {
    base.set(withTiming(now + 1_000, { duration: 1_000, easing: Easing.linear }));
  }, [base, now]);

  const labels = {
    N: t('common:compass.N'),
    E: t('common:compass.E'),
    S: t('common:compass.S'),
    W: t('common:compass.W'),
  };

  const backToNow = () => {
    offset.set(withTiming(0, { duration: 300 }));
    setTimeOffset(0);
  };

  return (
    <Screen title={t('common:tabs.sky')}>
      <View
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
              onSelect={(noradId) =>
                noradId === null ? clearSelection() : selectSatellite(noradId)
              }
            />
            <View style={styles.timelineRow}>
              <TimelineScrubber
                width={width - NOW_BUTTON_WIDTH - spacing.sm}
                base={base}
                offset={offset}
                clockStyle={clockStyle}
                onCommit={setTimeOffset}
              />
              <Pressable accessibilityRole="button" style={styles.button} onPress={backToNow}>
                <Text style={styles.buttonText}>{t('now')}</Text>
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
                time={now + committedOffset}
              />
            )}
          </>
        )}
      </View>
    </Screen>
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
