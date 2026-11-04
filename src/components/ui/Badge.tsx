import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';

type Tone = 'accent' | 'earth' | 'neutral' | 'danger';

const tones: Record<Tone, { bg: string; fg: string }> = {
  accent: { bg: colors.accentLight, fg: colors.accent },
  earth: { bg: colors.beige, fg: colors.earth2 },
  neutral: { bg: colors.beige, fg: colors.textSecondary },
  danger: { bg: '#F6E0DD', fg: colors.error },
};

export function Badge({ label, tone = 'accent' }: { label: string; tone?: Tone }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm + 2, paddingVertical: 3 },
  text: { fontSize: fontSize.xs, fontWeight: '600' },
});
