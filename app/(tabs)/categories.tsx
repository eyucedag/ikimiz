import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
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
  const columns = width >= 1200 ? 8 : width >= 900 ? 7 : width >= 600 ? 6 : 4;
  const tileWidth = `${100 / columns}%` as `${number}%`;
  const rowCount = Math.ceil((fullCategoryList.length + 1) / columns);
  const gridMinHeight = Math.max(0, Math.min(height - 260, rowCount * 112));

  return (
    <Screen inTabs>
      <View style={styles.content}>
        <Text style={styles.heading} accessibilityRole="header">
          Kategoriler
        </Text>
        <View style={[styles.grid, { minHeight: gridMinHeight }]}>
          {fullCategoryList.map((category) => (
            <CategoryTile
              key={category.slug}
              category={
                category.slug === 'ekrana-not' ? { ...category, title: 'Partnerinden Not' } : category
              }
              width={tileWidth}
            />
          ))}
          <CategoryTile category={moodCategory} width={tileWidth} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  heading: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'space-around',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
});
