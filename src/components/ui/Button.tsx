import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  toneColor?: string;
}

const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.accent, fg: colors.white, border: colors.accent },
  secondary: { bg: colors.card, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.accent, border: 'transparent' },
  danger: { bg: colors.card, fg: colors.error, border: colors.error },
};

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, style, compact, toneColor }: ButtonProps) {
  const { surfaceColor } = useAppAppearance();
  const p = palette[variant];
  const backgroundColor = toneColor && variant === 'primary' ? toneColor : variant === 'secondary' || variant === 'danger' ? surfaceColor : p.bg;
  const foregroundColor = toneColor && variant !== 'primary' ? toneColor : p.fg;
  const borderColor = toneColor && variant !== 'ghost' ? toneColor : p.border;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        { backgroundColor, borderColor },
        pressed && styles.pressed,
        inactive && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Feather name={icon} size={18} color={foregroundColor} style={styles.icon} /> : null}
          <Text style={[styles.label, { color: foregroundColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compact: { minHeight: 48, paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { marginRight: spacing.sm },
  label: { fontSize: fontSize.md, fontWeight: '600' },
  labelCompact: { fontSize: fontSize.md },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
