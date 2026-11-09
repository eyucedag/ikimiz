import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Category } from '@/src/types';
import { getCategoryRoute } from '@/src/constants/categories';
import { auroraCategoryIcons } from '@/src/constants/auroraAssets';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';

interface CategoryTileProps {
  category: Category;
  width: `${number}%`;
}

export function CategoryTile({ category, width }: CategoryTileProps) {
  const router = useRouter();
  const icon = auroraCategoryIcons[category.slug] ?? auroraCategoryIcons.takvim;
  return (
    <Pressable
      onPress={() => router.push(getCategoryRoute(category.slug))}
      accessibilityRole="button"
      accessibilityLabel={category.title}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
    >
      <View style={styles.surface}>
        <View style={styles.copy}>
          <View style={styles.iconFrame}>
            <Image source={icon} style={styles.iconImage} resizeMode="contain" />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {category.title}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { padding: spacing.xs, alignItems: 'center' },
  surface: {
    width: '100%',
    maxWidth: 136,
    aspectRatio: 1,
    padding: spacing.sm,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  copy: { width: '100%', alignItems: 'center', gap: spacing.xs },
  iconFrame: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
  },
  iconImage: { width: 25, height: 25 },
  title: {
    minHeight: 28,
    maxWidth: '100%',
    fontSize: fontSize.xs,
    lineHeight: 14,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
