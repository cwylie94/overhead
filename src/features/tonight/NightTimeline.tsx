import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View, type GestureResponderEvent } from 'react-native';

import type { UpcomingPass } from '@/data/queries';
import { brightnessTier, type BrightnessTier } from '@/domain/brightness';
import { formatHour, formatPassTime } from '@/i18n/format';
import { brightnessMarkColors, colors, radius, spacing, typography } from '@/ui/theme';

import type { NightSky, Interval } from './nightSky';
import {
  axisScale,
  BREAK_WIDTH,
  clip,
  hourMarks,
  hourStep,
  MIN_HOUR_SPACING,
  nearestPass,
  timeAtX,
  timelineAxis,
  timelineRange,
  xOfTime,
} from './timelineLayout';
import { loupeLabelTimes } from './timelineScrub';
import { TimelineScrubber, type ScrubPass } from './TimelineScrubber';

const TRACK_HEIGHT = 30;
const TOUCH_REACH = 16;
const MARKER_SIZE = 8;
const HOUR_LABEL_MAX_SCALE = 1.4;
const TICK_HEIGHT: Readonly<Record<BrightnessTier, number>> = {
  brilliant: 24,
  bright: 16,
  faint: 9,
};

type NightTimelineProps = {
  sky: NightSky | null;
  passes: UpcomingPass[];
  featuredId: number | null;
  now: number;
  onSelect(pass: UpcomingPass): void;
};

function tierOf(pass: UpcomingPass): BrightnessTier {
  return pass.peakMagnitude === null ? 'faint' : brightnessTier(pass.peakMagnitude);
}

export function NightTimeline({ sky, passes, featuredId, now, onSelect }: NightTimelineProps) {
  const { t, i18n } = useTranslation('tonight');
  const [width, setWidth] = useState(0);
  const [voiceIndex, setVoiceIndex] = useState<number | null>(null);
  const range = timelineRange(sky, passes);
  if (!range) {
    return null;
  }
  const axis = timelineAxis(range, passes);
  const at = (time: number) => xOfTime(time, axis, width);
  const span = (interval: Interval) => ({
    left: at(interval.from),
    width: at(interval.to) - at(interval.from),
  });
  const pieces = (intervals: Interval[]) =>
    axis.segments.flatMap((segment) =>
      intervals.flatMap((interval) => clip(interval, segment) ?? []),
    );
  const twilight = [
    sky?.darkFrom ? { from: range.from, to: sky.darkFrom } : null,
    sky?.darkUntil ? { from: sky.darkUntil, to: range.to } : null,
  ].filter((interval): interval is Interval => interval !== null);
  const moon = pieces(sky?.moonUp ?? []).map(span);
  const hours = axis.segments.flatMap((segment) => hourMarks(segment, hourStep(axis, width)));
  const showNow = now > range.from && now < range.to;
  const bright = passes.filter((pass) => tierOf(pass) !== 'faint');
  const featured = passes.find((pass) => pass.id === featuredId);

  const onPress = ({ nativeEvent }: GestureResponderEvent) => {
    if (width === 0) {
      return;
    }
    const time = timeAtX(nativeEvent.locationX, axis, width);
    const pass = nearestPass(passes, time, TOUCH_REACH / axisScale(axis, width));
    if (pass) {
      onSelect(pass);
    }
  };

  const scrubPasses = passes.map((pass): ScrubPass => {
    const tier = tierOf(pass);
    return {
      id: pass.id,
      startAt: pass.startAt,
      name: pass.name,
      time: formatPassTime(pass.startAt, i18n.language),
      color: brightnessMarkColors[tier],
      height: TICK_HEIGHT[tier],
    };
  });
  const loupeLabels = loupeLabelTimes(range).map((time) => ({
    time,
    text: formatPassTime(time, i18n.language),
  }));
  const selectById = (id: number) => {
    const pass = passes.find((candidate) => candidate.id === id);
    if (pass) {
      onSelect(pass);
    }
  };
  const step = (by: number) => {
    const next = Math.min(Math.max((voiceIndex ?? -1) + by, 0), passes.length - 1);
    setVoiceIndex(next);
    const pass = passes[next];
    if (pass) {
      onSelect(pass);
    }
  };
  const voicePass = voiceIndex === null ? null : scrubPasses[voiceIndex];

  return (
    <View style={styles.container}>
      <View style={styles.markerRow}>
        {width > 0 && featured && (
          <View style={[styles.marker, { left: at(featured.startAt) - MARKER_SIZE / 2 }]} />
        )}
      </View>
      <TimelineScrubber
        width={width}
        trackHeight={TRACK_HEIGHT}
        axis={axis}
        passes={scrubPasses}
        labels={loupeLabels}
        onSelect={selectById}>
        <Pressable
          accessibilityRole="adjustable"
          accessibilityLabel={t('timeline.label', {
            from: formatPassTime(range.from, i18n.language),
            to: formatPassTime(range.to, i18n.language),
            count: passes.length,
            bright: bright.length,
          })}
          accessibilityValue={
            voicePass ? { text: `${voicePass.name}, ${voicePass.time}` } : undefined
          }
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent }) =>
            step(nativeEvent.actionName === 'increment' ? 1 : -1)
          }
          onPress={onPress}
          onLayout={({ nativeEvent }) => setWidth(nativeEvent.layout.width)}
          style={styles.track}>
          {width > 0 && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {axis.segments.map((segment) => {
                const box = span(segment);
                return (
                  <View key={segment.from} style={[styles.segment, box]}>
                    {twilight.flatMap((interval) => {
                      const shade = clip(interval, segment);
                      return shade
                        ? [
                            <View
                              key={interval.from}
                              style={[
                                styles.twilight,
                                {
                                  left: at(shade.from) - box.left,
                                  width: at(shade.to) - at(shade.from),
                                },
                              ]}
                            />,
                          ]
                        : [];
                    })}
                  </View>
                );
              })}
              {axis.segments.slice(1).map((segment) => (
                <Text
                  key={segment.from}
                  style={[styles.break, { left: at(segment.from) - BREAK_WIDTH }]}>
                  ⋯
                </Text>
              ))}
              {passes.map((pass) => {
                const tier = tierOf(pass);
                const height = TICK_HEIGHT[tier];
                const isFeatured = pass.id === featuredId;
                return (
                  <View
                    key={pass.id}
                    style={[
                      styles.tick,
                      {
                        left: at(pass.startAt) - (isFeatured ? 1.5 : 1),
                        width: isFeatured ? 3 : tier === 'faint' ? 1.5 : 2,
                        height: isFeatured ? TRACK_HEIGHT - 4 : height,
                        top: (TRACK_HEIGHT - (isFeatured ? TRACK_HEIGHT - 4 : height)) / 2,
                        backgroundColor: brightnessMarkColors[tier],
                      },
                    ]}
                  />
                );
              })}
              {showNow && <View style={[styles.now, { left: at(now) - 1 }]} />}
            </View>
          )}
        </Pressable>
      </TimelineScrubber>
      <View style={styles.moonRow}>
        {width > 0 &&
          moon.map((interval) => <View key={interval.left} style={[styles.moon, interval]} />)}
      </View>
      <View style={styles.labels}>
        {width > 0 &&
          hours.map((time) => (
            <Text
              key={time}
              maxFontSizeMultiplier={HOUR_LABEL_MAX_SCALE}
              style={[styles.hour, { left: at(time) - MIN_HOUR_SPACING / 2 }]}>
              {formatHour(time, i18n.language)}
            </Text>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 3,
  },
  track: {
    height: TRACK_HEIGHT,
  },
  segment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  break: {
    ...typography.label,
    position: 'absolute',
    width: BREAK_WIDTH,
    top: (TRACK_HEIGHT - typography.label.lineHeight) / 2,
    textAlign: 'center',
    color: colors.textMuted,
  },
  twilight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: colors.surfaceRaised,
  },
  tick: {
    position: 'absolute',
    borderRadius: 1,
  },
  now: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: colors.now,
  },
  markerRow: {
    height: MARKER_SIZE,
  },
  marker: {
    position: 'absolute',
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  moonRow: {
    height: 3,
  },
  moon: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  labels: {
    height: typography.label.lineHeight,
    marginTop: spacing.xs / 2,
  },
  hour: {
    ...typography.label,
    fontWeight: '400',
    color: colors.textMuted,
    position: 'absolute',
    width: MIN_HOUR_SPACING,
    textAlign: 'center',
  },
});
