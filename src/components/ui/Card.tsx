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
  const customStyle = StyleSheet.flatten(style) ?? {};
  const edgeColor = typeof customStyle.borderColor === 'string' ? customStyle.borderColor : colors.border;
  const frameStyle = [styles.card, style, { backgroundColor: surfaceColor, borderColor: edgeColor, borderWidth: 1.5, borderRadius: radius.card, shadowColor: edgeColor }];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [frameStyle, pressed && styles.pressed]}
      >
        {children}
        <View pointerEvents="none" style={styles.reflection} />
      </Pressable>
    );
  }
  return <View style={frameStyle}>{children}<View pointerEvents="none" style={styles.reflection} /></View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  reflection: { position: 'absolute', top: 1, left: 14, right: 14, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.82)' },
  pressed: { opacity: 0.85 },
});
