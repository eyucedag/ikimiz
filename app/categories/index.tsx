import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { CategoryTile } from '@/src/components/CategoryTile';
import { KissCategoryButton } from '@/src/components/KissCategoryButton';
import { Screen } from '@/src/components/ui';
import { categories } from '@/src/constants/categories';
import { spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';

const mainCategories = categories.filter(
  (category) => !['opucuk', 'ekrana-not', 'gunun-sarkisi'].includes(category.slug),
);

export default function CategoriesScreen() {
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const couple = useCouple();
  const columns = width >= 1200 ? 8 : width >= 900 ? 7 : width >= 600 ? 6 : 4;
  const tablet = Math.min(width, height) >= 600;
  const landscapeTablet = tablet && width > height;
  const contentMaxWidth = landscapeTablet ? 1120 : tablet ? 900 : 600;
  const tileWidth = `${100 / columns}%` as `${number}%`;

  return (
    <Screen contentMaxWidth={contentMaxWidth}>
      <View style={styles.grid}>
        {mainCategories.map((category) => (
          <CategoryTile key={category.slug} category={category} width={tileWidth} />
        ))}
      </View>
      <KissCategoryButton ownerId={user?.id} partnerId={couple.partner?.id} coupleId={couple.couple?.id} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
});
