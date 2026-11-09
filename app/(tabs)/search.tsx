import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { CategoryTile } from '@/src/components/CategoryTile';
import { Screen } from '@/src/components/ui';
import { categories } from '@/src/constants/categories';
import { spacing } from '@/src/constants/theme';
import { Category } from '@/src/types';

const fullCategoryList = categories.filter((category) => category.slug !== 'opucuk');
const moodCategory: Category = {
  slug: 'ruh-halim',
  title: 'Ruh Halim',
  icon: 'heart',
  color: '#AD633F',
  tint: '#F2E7DB',
  description: 'Bugünkü ruh halinizi paylaşın ve geçmişi görün.',
};
export default function CategoriesTabScreen() {
  const { width } = useWindowDimensions();
  const columns = width >= 1200 ? 8 : width >= 900 ? 7 : width >= 600 ? 6 : 4;
  const tileWidth = `${100 / columns}%` as `${number}%`;

  return (
    <Screen inTabs>
      <View style={styles.content}>
        <View style={styles.grid}>
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
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
});
