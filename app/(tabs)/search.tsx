import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Card, Divider, EmptyState, Screen } from '@/src/components/ui';
import { categories, getCategoryRoute } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks/useAppState';
import { useCouple } from '@/src/hooks/useCouple';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { SearchResult } from '@/src/types';
import { relativeTime } from '@/src/utils/date';

/** Türkçe karakterlere duyarlı, büyük/küçük harf bağımsız eşleşme. */
const normalize = (s: string) => s.toLocaleLowerCase('tr-TR');

export default function SearchScreen() {
  const router = useRouter();
  const couple = useCouple();
  const { notes } = useScreenNotes(couple);
  const { notifications } = useAppState();
  const [query, setQuery] = useState('');

  const results = useMemo<SearchResult[]>(() => {
    const q = normalize(query.trim());
    if (!q) return [];
    const match = (...fields: (string | undefined)[]) => fields.some((f) => f && normalize(f).includes(q));

    const fromCategories = categories
      .filter((c) => c.slug !== 'opucuk')
      .filter((c) => match(c.title, c.description))
      .map((c) => ({
        id: `cat-${c.slug}`,
        group: 'Kategoriler',
        title: c.title,
        subtitle: c.description,
        route: getCategoryRoute(c.slug),
      }));
    const fromNotes = notes
      .filter((n) => match(n.text))
      .map((n) => ({
        id: `note-${n.id}`,
        group: 'Ekran Notları',
        title: `${n.emoji} ${n.text}`,
        subtitle: relativeTime(n.createdAt),
        route: '/screen-note/history',
      }));
    const fromNotifications = notifications
      .filter((n) => match(n.title, n.body))
      .map((n) => ({ id: `ntf-${n.id}`, group: 'Bildirimler', title: n.title, subtitle: n.body, route: '/notifications' }));

    return [...fromCategories, ...fromNotes, ...fromNotifications];
  }, [query, notes, notifications]);

  const groups = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    results.forEach((r) => map.set(r.group, [...(map.get(r.group) ?? []), r]));
    return Array.from(map.entries());
  }, [results]);

  return (
    <Screen inTabs>
      <Text style={styles.title} accessibilityRole="header">
        Ara
      </Text>
      <View style={styles.searchBox}>
        <Feather name="search" size={18} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Kategori, not veya bildirim ara"
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Aramayı temizle">
            <Feather name="x" size={18} color={colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {!query.trim() ? (
        <EmptyState
          icon="search"
          title="Ne arıyorsunuz?"
          description="Kategorilerde, ekran notlarınızda ve bildirimlerinizde arama yapabilirsiniz. Diğer modüller eklendikçe arama kapsamı genişleyecek."
        />
      ) : results.length === 0 ? (
        <EmptyState icon="inbox" title="Sonuç bulunamadı" description={`"${query.trim()}" için eşleşen bir kayıt yok.`} />
      ) : (
        groups.map(([group, items]) => (
          <View key={group} style={styles.group}>
            <Text style={styles.groupTitle}>{group}</Text>
            <Card style={styles.groupCard}>
              {items.map((item, index) => (
                <View key={item.id}>
                  {index > 0 ? <Divider /> : null}
                  <Pressable
                    onPress={() => item.route && router.push(item.route)}
                    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    accessibilityRole="button"
                  >
                    <View style={styles.flex}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowSubtitle} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.textTertiary} />
                  </Pressable>
                </View>
              ))}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginVertical: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  input: { flex: 1, minHeight: 46, marginLeft: spacing.sm, fontSize: fontSize.md, color: colors.text },
  group: { marginBottom: spacing.lg },
  groupTitle: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textTertiary, marginBottom: spacing.sm, textTransform: 'uppercase' },
  groupCard: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  flex: { flex: 1, marginRight: spacing.sm },
  rowTitle: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  rowSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  pressed: { opacity: 0.6 },
});
