import { Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { Category } from '@/src/types';
import { getCategoryRoute } from '@/src/constants/categories';
import { colors, fontSize, spacing } from '@/src/constants/theme';

interface CategoryTileProps {
  category: Category;
  width: `${number}%`;
}

export function CategoryTile({ category, width }: CategoryTileProps) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(getCategoryRoute(category.slug))}
      accessibilityRole="button"
      accessibilityLabel={category.title}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
    >
      <View style={[styles.iconCircle, { backgroundColor: category.color }]}>
        <Feather name={category.icon as keyof typeof Feather.glyphMap} size={25} color={colors.white} />
      </View>
      <Text style={styles.title} numberOfLines={3}>
        {category.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 108,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    maxWidth: '100%',
    fontSize: fontSize.xs,
    lineHeight: 13,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
