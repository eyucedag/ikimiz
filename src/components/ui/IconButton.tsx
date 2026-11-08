import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { colors, radius } from '@/src/constants/theme';

interface IconButtonProps {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  size?: number;
  filled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  color = colors.text,
  size = 22,
  filled,
  style,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [styles.base, filled && styles.filled, pressed && styles.pressed, style]}
    >
      <Feather name={icon} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.control,
  },
  filled: { backgroundColor: colors.beige },
  pressed: { opacity: 0.6 },
});
