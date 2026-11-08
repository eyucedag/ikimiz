import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { CategoryTile } from '@/src/components/CategoryTile';
import { DynamicSky } from '@/src/components/DynamicSky';
import { KissCategoryButton } from '@/src/components/KissCategoryButton';
import { IconButton, Screen, SectionHeader } from '@/src/components/ui';
import { categories } from '@/src/constants/categories';
import { colors, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';

const mainCategories = categories.filter(
  (category) => !['opucuk', 'ekrana-not', 'gunun-sarkisi'].includes(category.slug),
);

export default function CategoriesScreen() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const tablet = Math.min(width, height) >= 600;
  const landscapeTablet = tablet && width > height;
  const contentMaxWidth = landscapeTablet ? 1120 : tablet ? 900 : 600;
  const tileWidth = `${100 / columns}%` as `${number}%`;

  return (
    <Screen contentMaxWidth={contentMaxWidth}>
      <DynamicSky compact>
        <View style={styles.sceneHeading}>
          <IconButton
            icon="arrow-left"
            color={colors.cream}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            accessibilityLabel="Geri dön"
          />
          <View style={styles.sceneTitleGroup}>
            <Feather name="grid" size={17} color={colors.copper} />
            <Text style={styles.sceneTitle}>Kategoriler</Text>
          </View>
          <View style={styles.headingSpacer} />
        </View>
      </DynamicSky>
      <SectionHeader title="Birlikte alanlarınız" />
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
  sceneHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sceneTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sceneTitle: { color: colors.cream, fontFamily: 'serif', fontSize: 24, fontWeight: '600' },
  headingSpacer: { width: 40 },
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.md,
  },
});
