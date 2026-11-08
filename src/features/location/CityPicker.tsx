import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/ui/theme';

import type { City } from './citySearch';

export type CityPickerProps = {
  query: string;
  results: City[];
  onChangeQuery(query: string): void;
  onSelect(city: City): void;
  onCancel(): void;
};

export function CityPicker({ query, results, onChangeQuery, onSelect, onCancel }: CityPickerProps) {
  const { t } = useTranslation('settings');
  const searching = query.trim().length > 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          {t('location.pickerTitle')}
        </Text>
        <Pressable accessibilityRole="button" hitSlop={spacing.sm} onPress={onCancel}>
          <Text style={styles.cancel}>{t('location.cancel')}</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel={t('location.search')}
        placeholder={t('location.search')}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={onChangeQuery}
        autoFocus
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      <FlatList
        data={results}
        keyExtractor={(city) => `${city.name}|${city.country}|${city.latitude}|${city.longitude}`}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={styles.hint}>
            {searching ? t('location.noResults', { query: query.trim() }) : t('location.hint')}
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.country}`}
            onPress={() => onSelect(item)}
            style={styles.row}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.country}>{item.country}</Text>
          </Pressable>
        )}
        ListFooterComponent={<Text style={styles.credit}>{t('location.credit')}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  cancel: {
    ...typography.body,
    color: colors.accent,
  },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  row: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  name: {
    ...typography.body,
    color: colors.text,
  },
  country: {
    ...typography.caption,
    color: colors.textMuted,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    paddingVertical: spacing.sm,
  },
  credit: {
    ...typography.caption,
    color: colors.textMuted,
    paddingVertical: spacing.lg,
  },
});
