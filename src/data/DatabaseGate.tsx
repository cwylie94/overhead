import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/Text';
import { colors, spacing, typography } from '@/ui/theme';

import { useAppData } from './AppDataContext';
import { prepareDatabase } from './prepareDatabase';

type DatabaseGateProps = {
  children: ReactNode;
};

type PreparationState =
  { status: 'pending' } | { status: 'ready' } | { status: 'failed'; error: Error };

export function DatabaseGate({ children }: DatabaseGateProps) {
  const { t } = useTranslation();
  const data = useAppData();
  const [state, setState] = useState<PreparationState>({ status: 'pending' });

  useEffect(() => {
    let active = true;
    prepareDatabase(data).then(
      () => active && setState({ status: 'ready' }),
      (cause: unknown) =>
        active &&
        setState({
          status: 'failed',
          error: cause instanceof Error ? cause : new Error(String(cause)),
        }),
    );
    return () => {
      active = false;
    };
  }, [data]);

  useEffect(() => {
    if (state.status !== 'pending') {
      SplashScreen.hideAsync();
    }
  }, [state.status]);

  if (state.status === 'failed') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('errors.databaseTitle')}</Text>
        <Text style={styles.message}>{state.error.message}</Text>
      </View>
    );
  }

  if (state.status === 'pending') {
    return null;
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
  },
});
