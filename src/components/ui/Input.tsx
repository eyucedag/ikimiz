import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  compact?: boolean;
}

export const Input = forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(
  ({ label, error, hint, compact, style, ...rest }, ref) => {
    const { surfaceColor } = useAppAppearance();
    return (
      <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textTertiary}
          style={[
            styles.input,
            { backgroundColor: surfaceColor },
            compact && styles.inputCompact,
            !!error && styles.inputError,
            style,
          ]}
          {...rest}
        />
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : hint ? (
          <Text style={styles.hint}>{hint}</Text>
        ) : null}
      </View>
    );
  },
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  wrapperCompact: { marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '500' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E7DDD7',
    borderRadius: radius.control,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
    fontWeight: '500',
  },
  inputError: { borderColor: colors.error },
  inputCompact: { minHeight: 48, paddingVertical: spacing.md },
  error: { color: colors.error, fontSize: fontSize.xs, marginTop: spacing.xs },
  hint: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs },
});
