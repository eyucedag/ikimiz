import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { CategoryTile } from '@/src/components/CategoryTile';
import { Screen } from '@/src/components/ui';
import { categories, getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { Category } from '@/src/types';

const fullCategoryList = categories.filter((category) => category.slug !== 'opucuk');
const moodCategory: Category = {
  slug: 'ruh-halim',
  title: 'Ruh Halim',
  icon: 'heart',
  ...getCategoryColor('ruh-halim'),
  description: 'Bugünkü ruh halinizi paylaşın ve geçmişi görün.',
};
export default function CategoriesTabScreen() {
  const { width, height } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const columns = width >= 1200 ? 8 : width >= 900 ? 7 : width >= 600 ? 5 : 3;
  const tileWidth = `${100 / columns}%` as `${number}%`;
  const visibleCategories = useMemo(() => {
    const all = [...fullCategoryList, moodCategory];
    const normalized = query.trim().toLocaleLowerCase('tr-TR');
    return normalized
      ? all.filter((category) => category.title.toLocaleLowerCase('tr-TR').includes(normalized))
      : all;
  }, [query]);
  const rowCount = Math.ceil(visibleCategories.length / columns);
  const gridMinHeight = Math.max(0, Math.min(height - 300, rowCount * 112));

  return (
    <Screen inTabs>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>İKİNİZE AİT BİR DÜNYA</Text>
        <Text style={styles.heading} accessibilityRole="header">
          Kategoriler
        </Text>
        <Text style={styles.subtitle}>Hayatın her hâli, aynı yuvada.</Text>
        <View style={styles.searchBox}>
          <Feather name="search" size={17} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Ne yapmak istersiniz?"
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Kategori ara"
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>
        <View style={[styles.grid, { minHeight: gridMinHeight }]}>
          {visibleCategories.map((category) => (
            <CategoryTile
              key={category.slug}
              category={
                category.slug === 'ekrana-not' ? { ...category, title: 'Partnerinden Not' } : category
              }
              width={tileWidth}
            />
          ))}
        </View>
        {visibleCategories.length === 0 ? (
          <Text style={styles.noResults}>Bu isimde bir kategori bulunamadı.</Text>
        ) : null}
        <View style={styles.footer}>
          <Feather name="heart" size={13} color={colors.textTertiary} />
          <Text style={styles.footerText}>Küçük şeyler, güzel bir hayat.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingTop: spacing.sm },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    marginBottom: spacing.xs,
  },
  heading: {
    color: colors.text,
    fontSize: fontSize.xxxl,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  searchBox: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: 15,
    backgroundColor: colors.beige,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    paddingVertical: 0,
    color: colors.text,
    fontSize: fontSize.sm,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'flex-start',
    marginHorizontal: -spacing.xs,
  },
  noResults: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  footerText: {
    color: colors.textTertiary,
    fontSize: fontSize.xs,
  },
});
