import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/src/constants/theme';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  actionColor?: string;
  compact?: boolean;
}

export function SectionHeader({ title, actionLabel, onAction, actionColor, compact }: SectionHeaderProps) {
  return (
    <View style={[styles.row, compact && styles.compactRow]}>
      <Text style={[styles.title, compact && styles.compactTitle]} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="link">
          <Text style={[styles.action, actionColor ? { color: actionColor } : undefined]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  compactRow: { marginBottom: spacing.xs },
  title: { fontFamily: 'serif', fontSize: fontSize.lg, fontWeight: '700', color: colors.text, letterSpacing: 0.1 },
  compactTitle: { fontSize: fontSize.md },
  action: { fontSize: fontSize.sm, fontWeight: '600', color: colors.accent },
});
