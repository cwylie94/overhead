import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Rarity } from '@/domain/types';
import { formatPassTime } from '@/i18n/format';
import { Chip } from '@/ui/Chip';
import { Icon } from '@/ui/Icon';
import {
  brightnessMarkColors,
  colors,
  radius,
  rarityColors,
  spacing,
  typography,
} from '@/ui/theme';

import { CameraWalkthrough } from './CameraWalkthrough';
import { DomeIllustration } from './DomeIllustration';

export const ONBOARDING_STEPS = ['welcome', 'location', 'catching', 'camera', 'reminders'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

const SAMPLE_PASS_TIME = new Date(2026, 0, 1, 20, 57).getTime();
const SAMPLE_TICKS = [
  { at: 0.16, tier: 'bright' },
  { at: 0.28, tier: 'brilliant' },
  { at: 0.38, tier: 'faint' },
  { at: 0.54, tier: 'bright' },
  { at: 0.72, tier: 'brilliant' },
  { at: 0.84, tier: 'faint' },
] as const;
const TICK_HEIGHT = { brilliant: 16, bright: 10, faint: 6 } as const;
const SAMPLE_RARITIES: Rarity[] = ['legendary', 'rare', 'uncommon'];

export type OnboardingViewProps = {
  step: OnboardingStep;
  place: string | null;
  onNext(): void;
  onBack(): void;
  onSkip(): void;
  onDemo(): void;
  onUseLocation(): void;
  onChooseCity(): void;
  onEnableReminders(): void;
  onFinish(): void;
};

export function OnboardingView(props: OnboardingViewProps) {
  const { t } = useTranslation('onboarding');
  const index = ONBOARDING_STEPS.indexOf(props.step);
  const canSkip = props.step === 'welcome' || props.step === 'catching' || props.step === 'camera';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.bar}>
        {index > 0 ? <TextButton label={t('back')} onPress={props.onBack} /> : <View />}
        {canSkip && <TextButton label={t('skip')} muted onPress={props.onSkip} />}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <StepContent {...props} />
      </ScrollView>
      <View style={styles.footer}>
        <Progress index={index} />
        <StepActions {...props} />
      </View>
    </SafeAreaView>
  );
}

function StepContent({ step, place }: OnboardingViewProps) {
  const { t, i18n } = useTranslation('onboarding');
  const { t: common } = useTranslation('common');

  switch (step) {
    case 'welcome':
      return (
        <>
          <DomeIllustration />
          <Heading title={t('welcome.title')} body={t('welcome.body')} />
        </>
      );
    case 'location':
      return (
        <>
          <Heading title={t('location.title')} body={t('location.body')} />
          {place && (
            <View style={[styles.card, styles.placeCard]}>
              <Icon
                name={'location'}
                size={18}
                tintColor={colors.accent}
                fallback={<Text style={styles.icon}>⌖</Text>}
              />
              <Text style={styles.cardTitle}>{place}</Text>
            </View>
          )}
        </>
      );
    case 'catching':
      return (
        <>
          <Heading title={t('catching.title')} />
          <View style={styles.card}>
            <HowStep number={1} title={t('catching.pick')} hint={t('catching.pickHint')}>
              <SampleTimeline />
            </HowStep>
            <HowStep number={2} title={t('catching.open')} hint={t('catching.openHint')} />
            <HowStep number={3} title={t('catching.hold')} hint={t('catching.holdHint')}>
              <View style={styles.chips}>
                {SAMPLE_RARITIES.map((rarity) => (
                  <Chip
                    key={rarity}
                    label={common(`rarity.${rarity}`)}
                    color={rarityColors[rarity]}
                  />
                ))}
              </View>
            </HowStep>
          </View>
        </>
      );
    case 'camera':
      return (
        <>
          <Heading title={t('camera.title')} body={t('camera.body')} />
          <CameraWalkthrough />
        </>
      );
    case 'reminders':
      return (
        <>
          <Heading title={t('reminders.title')} body={t('reminders.body')} />
          <View style={[styles.card, styles.sampleRow]}>
            <Text style={styles.sampleTime}>{formatPassTime(SAMPLE_PASS_TIME, i18n.language)}</Text>
            <View style={styles.sampleName}>
              <Text style={styles.cardTitle}>OAO 3</Text>
              <Text style={[styles.rarity, { color: rarityColors.legendary }]}>
                {common('rarity.legendary')}
              </Text>
            </View>
            <Icon
              name={'bell'}
              size={18}
              tintColor={colors.accent}
              fallback={<Text style={styles.icon}>○</Text>}
            />
          </View>
        </>
      );
  }
}

function StepActions(props: OnboardingViewProps) {
  const { t } = useTranslation('onboarding');

  switch (props.step) {
    case 'welcome':
      return (
        <>
          <PrimaryButton
            testID="onboarding-start"
            label={t('welcome.start')}
            onPress={props.onNext}
          />
          <TextButton label={t('welcome.demo')} centered onPress={props.onDemo} />
        </>
      );
    case 'location':
      return (
        <>
          {props.place ? (
            <PrimaryButton
              testID="onboarding-continue"
              label={t('location.continue')}
              onPress={props.onNext}
            />
          ) : (
            <PrimaryButton
              testID="onboarding-use-location"
              label={t('location.useMine')}
              onPress={props.onUseLocation}
            />
          )}
          <SecondaryButton
            testID="onboarding-choose-city"
            label={t('location.chooseCity')}
            onPress={props.onChooseCity}
          />
          {!props.place && <Text style={styles.note}>{t('location.fallback')}</Text>}
        </>
      );
    case 'catching':
      return (
        <PrimaryButton testID="onboarding-next" label={t('catching.next')} onPress={props.onNext} />
      );
    case 'camera':
      return (
        <PrimaryButton
          testID="onboarding-camera-next"
          label={t('camera.next')}
          onPress={props.onNext}
        />
      );
    case 'reminders':
      return (
        <>
          <PrimaryButton
            testID="onboarding-reminders"
            label={t('reminders.enable')}
            onPress={props.onEnableReminders}
          />
          <SecondaryButton
            testID="onboarding-finish"
            label={t('reminders.later')}
            onPress={props.onFinish}
          />
        </>
      );
  }
}

function Heading({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {body && <Text style={styles.body}>{body}</Text>}
    </View>
  );
}

function HowStep({
  number,
  title,
  hint,
  children,
}: {
  number: number;
  title: string;
  hint: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.howStep}>
      <View style={styles.number}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={styles.howText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
        {children}
      </View>
    </View>
  );
}

function SampleTimeline() {
  return (
    <View style={styles.timeline}>
      {SAMPLE_TICKS.map(({ at, tier }) => (
        <View
          key={at}
          style={[
            styles.tick,
            {
              left: `${at * 100}%`,
              height: TICK_HEIGHT[tier],
              backgroundColor: brightnessMarkColors[tier],
            },
          ]}
        />
      ))}
    </View>
  );
}

function Progress({ index }: { index: number }) {
  const { t } = useTranslation('onboarding');
  return (
    <View
      accessible
      accessibilityLabel={t('progress', { step: index + 1, total: ONBOARDING_STEPS.length })}
      style={styles.dots}>
      {ONBOARDING_STEPS.map((step, dot) => (
        <View key={step} style={[styles.dot, dot === index && styles.dotOn]} />
      ))}
    </View>
  );
}

type ButtonProps = { label: string; testID?: string; onPress(): void };

function PrimaryButton({ label, testID, onPress }: ButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, testID, onPress }: ButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

function TextButton({
  label,
  muted = false,
  centered = false,
  onPress,
}: ButtonProps & { muted?: boolean; centered?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={spacing.sm}
      onPress={onPress}
      style={centered && styles.centered}>
      <Text style={[styles.link, muted && styles.linkMuted]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  heading: {
    gap: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    ...typography.heading,
    color: colors.accent,
  },
  cardTitle: {
    ...typography.heading,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  howStep: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  howText: {
    flex: 1,
    gap: 2,
  },
  number: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: {
    ...typography.label,
    color: colors.accent,
  },
  timeline: {
    height: 24,
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
  },
  tick: {
    position: 'absolute',
    width: 2,
    borderRadius: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sampleTime: {
    ...typography.body,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  sampleName: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  rarity: {
    ...typography.label,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotOn: {
    width: 18,
    backgroundColor: colors.accent,
  },
  primary: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
    paddingVertical: spacing.sm + spacing.xs,
    alignItems: 'center',
  },
  primaryText: {
    ...typography.heading,
    color: colors.accent,
  },
  secondary: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + spacing.xs,
    alignItems: 'center',
  },
  secondaryText: {
    ...typography.heading,
    color: colors.text,
  },
  pressed: {
    opacity: 0.7,
  },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  centered: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
  },
  link: {
    ...typography.heading,
    color: colors.accent,
  },
  linkMuted: {
    color: colors.textMuted,
  },
});
