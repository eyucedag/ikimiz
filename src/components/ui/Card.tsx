import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '@/src/constants/theme';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}

export function Card({ children, style, onPress, accessibilityLabel }: CardProps) {
  const { surfaceColor } = useAppAppearance();
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.card, style, { backgroundColor: surfaceColor, borderWidth: 1, borderRadius: radius.card }, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style, { backgroundColor: surfaceColor, borderWidth: 1, borderRadius: radius.card }]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#EAE1DC',
    ...shadow,
  },
  pressed: { opacity: 0.85 },
});
