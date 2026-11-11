import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/src/constants/theme';

/** Eşleşme bilgisi yüklenirken kısa bekleme görünümü. */
export function CoupleLoading() {
  return (
    <View
      style={styles.container}
      accessibilityLiveRegion="polite"
      accessibilityLabel="Eşleşme bilgisi yükleniyor"
    >
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.label}>Yükleniyor…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  label: { color: colors.textSecondary, fontSize: fontSize.sm },
});
