import React from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CategoryTile } from '@/src/components/CategoryTile';
import { DynamicSky } from '@/src/components/DynamicSky';
import { Screen, SectionHeader } from '@/src/components/ui';
import { categories } from '@/src/constants/categories';
import { colors, spacing } from '@/src/constants/theme';
import { Category } from '@/src/types';

const fullCategoryList = categories.filter((category) => category.slug !== 'opucuk');
const moodCategory: Category = { slug: 'ruh-halim', title: 'Ruh Halim', icon: 'heart', color: '#AD633F', tint: '#F2E7DB', description: 'Bugünkü ruh halinizi paylaşın ve geçmişi görün.' };
export default function CategoriesTabScreen() {
  const { width } = useWindowDimensions();
  const columns = width >= 1000 ? 4 : width >= 640 ? 3 : 2;
  const tileWidth = `${100 / columns}%` as `${number}%`;

  return (
    <Screen inTabs>
      <View style={styles.content}>
        <DynamicSky compact>
          <View style={styles.sceneHeading}>
            <View style={styles.headingSpacer} />
            <View style={styles.sceneTitleGroup}><Feather name="grid" size={17} color={colors.copper} /><Text style={styles.sceneTitle}>Kategoriler</Text></View>
            <View style={styles.headingSpacer} />
          </View>
        </DynamicSky>
        <SectionHeader title="Birlikte alanlarınız" />
        <View style={styles.grid}>
          {fullCategoryList.map((category) => <CategoryTile key={category.slug} category={category} width={tileWidth} />)}
          <CategoryTile category={moodCategory} width={tileWidth} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 900, alignSelf: 'center' },
  sceneHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sceneTitleGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sceneTitle: { color: colors.cream, fontFamily: 'serif', fontSize: 24, fontWeight: '600' },
  headingSpacer: { width: 40 },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs, marginBottom: spacing.md },
});
