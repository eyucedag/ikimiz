import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Category } from '@/src/types';
import { getCategoryRoute } from '@/src/constants/categories';
import { colors, fontSize, radius, shadow, spacing } from '@/src/constants/theme';

interface CategoryTileProps { category: Category; width: `${number}%` }

export function CategoryTile({ category, width }: CategoryTileProps) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(getCategoryRoute(category.slug))}
      accessibilityRole="button"
      accessibilityLabel={category.title}
      style={({ pressed }) => [styles.tile, { width }, pressed && styles.pressed]}
    >
      <View style={styles.surface}>
        <View style={styles.icon}><Feather name={category.icon as keyof typeof Feather.glyphMap} size={20} color={colors.copper} /></View>
        <Text style={styles.title} numberOfLines={2}>{category.title}</Text>
        <Feather name="arrow-up-right" size={15} color={colors.sage} style={styles.arrow} />
        <View pointerEvents="none" style={styles.glint} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { padding: spacing.xs },
  surface: { minHeight: 104, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(29,74,61,0.78)', ...shadow },
  icon: { width: 38, height: 38, flexShrink: 0, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(233,154,105,0.12)', borderWidth: 1, borderColor: 'rgba(233,154,105,0.28)' },
  title: { flex: 1, fontSize: fontSize.sm, lineHeight: 18, fontWeight: '600', color: colors.cream },
  arrow: { position: 'absolute', right: spacing.sm, top: spacing.sm },
  glint: { position: 'absolute', top: 1, left: 14, right: 14, height: 1, backgroundColor: 'rgba(246,233,215,0.24)' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
});
