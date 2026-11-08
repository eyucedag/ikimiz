import { StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/src/constants/theme';

export function Divider({ inset = 0, spaced }: { inset?: number; spaced?: boolean }) {
  return <View style={[styles.line, { marginLeft: inset }, spaced && styles.spaced]} />;
}

const styles = StyleSheet.create({
  line: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  spaced: { marginVertical: spacing.md },
});
