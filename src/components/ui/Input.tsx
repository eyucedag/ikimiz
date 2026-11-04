import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  compact?: boolean;
}

export const Input = forwardRef<React.ComponentRef<typeof TextInput>, InputProps>(({ label, error, hint, compact, style, ...rest }, ref) => (
  <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      ref={ref}
      placeholderTextColor={colors.textTertiary}
      style={[styles.input, compact && styles.inputCompact, !!error && styles.inputError, style]}
      {...rest}
    />
    {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
  </View>
));

Input.displayName = 'Input';

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  wrapperCompact: { marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '500' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  inputCompact: { minHeight: 42, paddingVertical: spacing.sm },
  error: { color: colors.error, fontSize: fontSize.xs, marginTop: spacing.xs },
  hint: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs },
});
