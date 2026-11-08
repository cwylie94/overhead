import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@/ui/theme';

import { db } from './client';
import migrations from './migrations/migrations';

type DatabaseGateProps = {
  children: ReactNode;
};

export function DatabaseGate({ children }: DatabaseGateProps) {
  const { t } = useTranslation();
  const { success, error } = useMigrations(db, migrations);
  const settled = success || error !== undefined;

  useEffect(() => {
    if (settled) {
      SplashScreen.hideAsync();
    }
  }, [settled]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('errors.databaseTitle')}</Text>
        <Text style={styles.message}>{error.message}</Text>
      </View>
    );
  }

  if (!success) {
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
