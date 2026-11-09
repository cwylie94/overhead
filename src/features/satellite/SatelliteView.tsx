import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SatelliteDetail } from '@/data/queries';
import { perigeeAltitudeKm, apogeeAltitudeKm, periodMinutes } from '@/domain/orbit';
import { silhouetteFor } from '@/domain/silhouette';
import type { OmmRecord, UnitSystem } from '@/domain/types';
import {
  formatCalendarDate,
  formatDistance,
  formatNightDate,
  formatPassTime,
} from '@/translations/format';
import { Chip } from '@/ui/Chip';
import { SilhouetteArt } from '@/ui/SilhouetteArt';
import { Text } from '@/ui/Text';
import { colors, radius, rarityColors, spacing, typography } from '@/ui/theme';

import { SatelliteCard } from './SatelliteCard';
import { SightingList, type SightingListItem } from './SightingList';

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

export type SatelliteViewProps = {
  satellite: SatelliteDetail;
  orbit: OmmRecord | null;
  hostName: string | null;
  nextPassAt: number | null;
  sightings: SightingListItem[];
  units: UnitSystem;
  onDeleteSighting(id: string): void;
  onClose(): void;
};

export function SatelliteView({
  satellite,
  orbit,
  hostName,
  nextPassAt,
  sightings,
  units,
  onDeleteSighting,
  onClose,
}: SatelliteViewProps) {
  const { t, i18n } = useTranslation(['collection', 'common']);

  const firstCatch = sightings.reduce<number | null>(
    (earliest, sighting) =>
      earliest === null ? sighting.observedAt : Math.min(earliest, sighting.observedAt),
    null,
  );
  const bestAim = sightings.reduce<number | null>(
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
      <View style={styles.art}>
        <SilhouetteArt
          silhouette={silhouetteFor(satellite)}
          color={firstCatch === null ? colors.border : accent}
          solid={firstCatch === null}
        />
      </View>
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
      {hostName && <Fact label={t('detail.dockedTo')} value={hostName} />}
      {orbit && (
        <>
          <Fact
            label={t('detail.orbit')}
            value={t('detail.orbitValue', {
              perigee: formatDistance(
                perigeeAltitudeKm(orbit.MEAN_MOTION, orbit.ECCENTRICITY),
                units,
                i18n.language,
              ),
              apogee: formatDistance(
                apogeeAltitudeKm(orbit.MEAN_MOTION, orbit.ECCENTRICITY),
                units,
                i18n.language,
              ),
              inclination: orbit.INCLINATION.toFixed(1),
            })}
          />
          <Fact
            label={t('detail.period')}
            value={t('detail.periodValue', {
              minutes: Math.round(periodMinutes(orbit.MEAN_MOTION)),
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
          : t('detail.sightings', { count: sightings.length })}
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
        {nextPassAt !== null
          ? t('detail.nextPassValue', {
              day: formatNightDate(nextPassAt, i18n.language),
              time: formatPassTime(nextPassAt, i18n.language),
            })
          : t('detail.noPass')}
      </Text>
    </View>
  );

  const confirmDelete = (sighting: SightingListItem) => {
    Alert.alert(t('detail.deleteTitle'), t('detail.deleteBody'), [
      { text: t('detail.cancel'), style: 'cancel' },
      {
        text: t('detail.delete'),
        style: 'destructive',
        onPress: () => onDeleteSighting(sighting.id),
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <SatelliteCard accent={accent} rarity={satellite.rarity} front={front} back={back} />
        <SightingList sightings={sightings} onDelete={confirmDelete} />
        <Pressable accessibilityRole="button" style={styles.close} onPress={onClose}>
          <Text style={styles.closeText}>{t('detail.close')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  art: {
    alignSelf: 'center',
    width: '62%',
    marginBottom: spacing.sm,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
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
