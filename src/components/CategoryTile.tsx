import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Category } from '@/src/types';
import { getCategoryRoute } from '@/src/constants/categories';
import { auroraCategoryIllustrations, auroraIcons } from '@/src/constants/auroraAssets';
import { colors, fontSize, radius, shadow, spacing } from '@/src/constants/theme';

interface CategoryTileProps {
  category: Category;
  width: `${number}%`;
}

export function CategoryTile({ category, width }: CategoryTileProps) {
  const router = useRouter();
  const illustration = auroraCategoryIllustrations[category.slug];
  const icon =
    auroraIcons[
      category.slug === 'ozel-gunler'
        ? 'specialDates'
        : category.slug === 'listeler'
          ? 'lists'
          : category.slug === 'notlar'
            ? 'notebook'
            : category.slug === 'onemli-belgeler'
              ? 'documents'
              : category.slug === 'sesli-anilar'
                ? 'audioMemories'
                : category.slug === 'hediye-radari'
                  ? 'giftRadar'
                  : category.slug === 'bilinmesi-gerekenler'
                    ? 'importantFacts'
                    : category.slug === 'gezilen-yerler'
                      ? 'places'
                      : category.slug === 'birlikte-adimlar'
                        ? 'steps'
                        : (category.slug as keyof typeof auroraIcons)
    ] ?? auroraIcons.calendar;
  return (
    <Pressable
      onPress={() => router.push(getCategoryRoute(category.slug))}
      accessibilityRole="button"
      accessibilityLabel={category.title}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
    >
      <View style={styles.surface}>
        <View style={styles.copy}>
          <View style={styles.icon}>
            <Image source={icon} style={styles.iconImage} resizeMode="contain" tintColor={colors.copper} />
          </View>
          <Text style={styles.title} numberOfLines={2}>
            {category.title}
          </Text>
        </View>
        {illustration ? (
          <Image source={illustration} style={styles.illustration} resizeMode="contain" />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { padding: spacing.xs },
  surface: {
    minHeight: 112,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(105,124,108,0.3)',
    backgroundColor: colors.card,
    overflow: 'hidden',
    ...shadow,
  },
  copy: { zIndex: 1, width: '67%', alignItems: 'flex-start', gap: spacing.xs },
  icon: {
    width: 30,
    height: 30,
    flexShrink: 0,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentLight,
  },
  iconImage: { width: 23, height: 23 },
  title: { fontSize: fontSize.sm, lineHeight: 18, fontWeight: '600', color: colors.text },
  illustration: { position: 'absolute', width: 84, height: 84, right: -5, bottom: -7, opacity: 0.94 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
