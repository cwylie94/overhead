import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db, repositories } from '@/data/client';
import { satelliteSightingsQuery } from '@/data/queries';
import { perigeeAltitudeKm, apogeeAltitudeKm, periodMinutes } from '@/domain/orbit';
import { useNow } from '@/environment/clock';
import { formatCalendarDate, formatDistance, formatNightDate, formatPassTime } from '@/i18n/format';
import { useSettingsStore } from '@/stores/settingsStore';
import { Chip } from '@/ui/Chip';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

import { SatelliteCard } from './SatelliteCard';

const OWNER_CODES = [
  'US',
  'CIS',
  'PRC',
  'JPN',
  'ESA',
  'FR',
  'IT',
  'CA',
  'ISS',
  'ARGN',
  'IND',
  'THAI',
  'MEX',
] as const;
type OwnerCode = (typeof OWNER_CODES)[number];

function isOwnerCode(code: string): code is OwnerCode {
  return OWNER_CODES.some((known) => known === code);
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue}>{value}</Text>
    </View>
  );
}

export function SatelliteScreen() {
  const { noradId } = useLocalSearchParams<{ noradId: string }>();
  const id = Number(noradId);
  const { t, i18n } = useTranslation(['collection', 'common']);
  const units = useSettingsStore((settings) => settings.units);
  const now = useNow(60_000);
  const satellite = useMemo(() => repositories.satellites.getById(id), [id]);
  const orbit = useMemo(() => repositories.orbits.getById(id), [id]);
  const nextPass = useMemo(() => repositories.passes.nextForSatellite(id, now), [id, now]);
  const { data: sightings } = useLiveQuery(satelliteSightingsQuery(db, id), [id]);

  if (!satellite) {
    return null;
  }

  const verified = sightings.filter((sighting) => sighting.verified);
  const firstCatch = verified.reduce<number | null>(
    (earliest, sighting) =>
      earliest === null ? sighting.observedAt : Math.min(earliest, sighting.observedAt),
    null,
  );
  const bestAim = verified.reduce<number | null>(
    (best, sighting) =>
      sighting.angleError === null
        ? best
        : best === null
          ? sighting.angleError
          : Math.min(best, sighting.angleError),
    null,
  );
  const owner = isOwnerCode(satellite.owner)
    ? t(`common:owners.${satellite.owner}`)
    : satellite.owner;
  const accent = rarityColors[satellite.rarity];

  const front = (
    <View style={styles.side}>
      <Text style={styles.name}>{satellite.name}</Text>
      <View style={styles.chips}>
        <Chip label={t(`common:rarity.${satellite.rarity}`)} color={accent} />
        {firstCatch === null && <Chip label={t('detail.notCaught')} color={colors.textMuted} />}
      </View>
      <Fact label={t('detail.set')} value={t(`sets.${satellite.collectionSet}`)} />
      <Fact
        label={t('detail.launched')}
        value={
          satellite.launchDate
            ? formatCalendarDate(satellite.launchDate, i18n.language)
            : t('detail.unknownDate')
        }
      />
      <Fact label={t('detail.owner')} value={owner} />
      {orbit && (
        <>
          <Fact
            label={t('detail.orbit')}
            value={t('detail.orbitValue', {
              perigee: formatDistance(
                perigeeAltitudeKm(orbit.omm.MEAN_MOTION, orbit.omm.ECCENTRICITY),
                units,
                i18n.language,
              ),
              apogee: formatDistance(
                apogeeAltitudeKm(orbit.omm.MEAN_MOTION, orbit.omm.ECCENTRICITY),
                units,
                i18n.language,
              ),
              inclination: orbit.omm.INCLINATION.toFixed(1),
            })}
          />
          <Fact
            label={t('detail.period')}
            value={t('detail.periodValue', {
              minutes: Math.round(periodMinutes(orbit.omm.MEAN_MOTION)),
            })}
          />
        </>
      )}
      <Text style={styles.hint}>{t('detail.flipHint')}</Text>
    </View>
  );

  const back = (
    <View style={styles.side}>
      <Text style={styles.heading}>{t('detail.yourSightings')}</Text>
      <Text style={styles.body}>
        {sightings.length === 0
          ? t('detail.noSightings')
          : t('detail.sightings', { count: sightings.length, verified: verified.length })}
      </Text>
      {firstCatch !== null && (
        <Text style={styles.body}>
          {t('detail.firstCaught', { date: formatCalendarDate(firstCatch, i18n.language) })}
        </Text>
      )}
      {bestAim !== null && (
        <Text style={styles.body}>{t('detail.bestAim', { degrees: bestAim.toFixed(1) })}</Text>
      )}
      <Text style={styles.heading}>{t('detail.nextPass')}</Text>
      <Text style={styles.body}>
        {nextPass
          ? t('detail.nextPassValue', {
              day: formatNightDate(nextPass.startAt, i18n.language),
              time: formatPassTime(nextPass.startAt, i18n.language),
            })
          : t('detail.noPass')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen}>
      <SatelliteCard accent={accent} front={front} back={back} />
      <Pressable accessibilityRole="button" style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>{t('detail.close')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  side: {
    flex: 1,
    gap: spacing.sm,
  },
  name: {
    ...typography.title,
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  fact: {
    gap: 2,
  },
  factLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  factValue: {
    ...typography.body,
    color: colors.text,
  },
  heading: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 'auto',
  },
  close: {
    alignSelf: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  closeText: {
    ...typography.heading,
    color: colors.text,
  },
});
