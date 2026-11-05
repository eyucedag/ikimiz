import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, IconButton, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { supabase } from '@/src/lib/supabase';
import { listService, SharedList, SharedListKind } from '@/src/services/listService';

const listKinds: { value: SharedListKind; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { value: 'grocery', label: 'Market', icon: 'shopping-cart' },
  { value: 'movie', label: 'Film', icon: 'film' },
  { value: 'travel', label: 'Seyahat', icon: 'map' },
  { value: 'wish', label: 'İstek', icon: 'heart' },
  { value: 'general', label: 'Diğer', icon: 'list' },
];

const listKindLabel = (kind: SharedListKind) => listKinds.find((entry) => entry.value === kind)?.label ?? 'Diğer';

export default function ListsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const listColor = getCategoryColor('listeler');
  const [lists, setLists] = useState<SharedList[]>([]);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<SharedListKind>('grocery');
  const [filter, setFilter] = useState<'all' | SharedListKind>('all');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (silent = false) => {
    if (!couple.couple?.id) return;
    if (!silent) setLoading(true);
    try { setLists(await listService.list(couple.couple.id)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Listeler yüklenemedi.'); }
    finally { if (!silent) setLoading(false); }
  }, [couple.couple?.id]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = supabase.channel(`shared-lists-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(true); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(true); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, refresh]);

  const create = async () => {
    if (!user || !couple.couple || !couple.partner) return;
    setSaving(true); setError('');
    try {
      const created = await listService.create({ ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id, title, kind });
      setLists((current) => [created, ...current]); setTitle('');
      router.push({ pathname: '/lists/[id]', params: { id: created.id } });
    } catch (e) { setError(e instanceof Error ? e.message : 'Liste oluşturulamadı.'); }
    finally { setSaving(false); }
  };

  const remove = (list: SharedList) => Alert.alert('Listeyi kaldır', `${list.title} ve içindeki maddeler kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await listService.remove(list.id); setLists((current) => current.filter((entry) => entry.id !== list.id)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Liste kaldırılamadı.'); }
    } },
  ]);

  const visibleLists = filter === 'all' ? lists : lists.filter((list) => list.kind === filter);

  if (couple.loading) return <Screen title="Listeler"><CoupleLoading /></Screen>;

  return (
    <Screen title="Listeler" headerRight={<IconButton icon="refresh-cw" accessibilityLabel="Listeleri yenile" onPress={() => { void refresh(); }} />} refreshing={loading} onRefresh={() => { void refresh(); }}>
      {!couple.isPaired || !couple.couple ? <EmptyState icon="users" title="Önce eşleşin" description="Ortak listeleri kullanmak için partnerinizle eşleşin." /> : <>
        <Card style={[styles.form, { borderColor: listColor.color }]}>
          <Text style={[styles.formTitle, { color: listColor.color }]}>Yeni liste</Text>
          <Input label="Liste adı" compact placeholder="…" value={title} onChangeText={setTitle} onSubmitEditing={() => { void create(); }} returnKeyType="done" />
          <Text style={styles.label}>Liste türü</Text>
          <View style={styles.kindRow}>
            {listKinds.map((entry) => <Pressable key={entry.value} onPress={() => setKind(entry.value)} style={[styles.kindChip, kind === entry.value && { borderColor: listColor.color, backgroundColor: listColor.tint }]} accessibilityRole="button" accessibilityState={{ selected: kind === entry.value }}>
              <Feather name={entry.icon} size={13} color={kind === entry.value ? listColor.color : colors.textSecondary} />
              <Text style={[styles.kindText, kind === entry.value && { color: listColor.color }]}>{entry.label}</Text>
            </Pressable>)}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Liste oluştur" icon="plus" toneColor={listColor.color} compact onPress={() => { void create(); }} loading={saving} disabled={!title.trim()} />
        </Card>

        <View style={styles.filterRow}>
          <Pressable onPress={() => setFilter('all')} style={[styles.filterChip, filter === 'all' && { backgroundColor: listColor.color, borderColor: listColor.color }]}><Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Tümü</Text></Pressable>
          {listKinds.map((entry) => <Pressable key={entry.value} onPress={() => setFilter(entry.value)} style={[styles.filterChip, filter === entry.value && { backgroundColor: listColor.color, borderColor: listColor.color }]}><Text style={[styles.filterText, filter === entry.value && styles.filterTextActive]}>{entry.label}</Text></Pressable>)}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading && lists.length === 0 ? <View style={styles.loading}><ActivityIndicator color={listColor.color} /></View>
          : visibleLists.length === 0 ? <Card style={styles.emptyCard}><EmptyState compact icon="list" toneColor={listColor.color} toneTint={listColor.tint} title={lists.length === 0 ? 'Henüz liste yok' : 'Bu türde liste yok'} description={lists.length === 0 ? 'Bir liste oluşturup maddeleri birlikte ekleyin.' : 'Başka bir tür seçin veya yeni liste oluşturun.'} /></Card>
            : visibleLists.map((list) => <Card key={list.id} style={[styles.listCard, { borderColor: listColor.color }]}>
              <Pressable onPress={() => router.push({ pathname: '/lists/[id]', params: { id: list.id } })} accessibilityRole="button" accessibilityLabel={`${list.title} listesini aç`} style={styles.listPress}>
                <View style={[styles.listIcon, { backgroundColor: listColor.tint }]}><Feather name={listKinds.find((entry) => entry.value === list.kind)?.icon ?? 'list'} size={18} color={listColor.color} /></View>
                <View style={styles.listCopy}>
                  <Text style={styles.listTitle} numberOfLines={1}>{list.title}</Text>
                  <Text style={styles.listMeta}>{listKindLabel(list.kind)} · {list.checkedCount}/{list.itemCount} tamamlandı</Text>
                </View>
                <Feather name="chevron-right" size={18} color={listColor.color} />
              </Pressable>
              {list.ownerId === user?.id ? <Pressable onPress={() => remove(list)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${list.title} listesini kaldır`} style={styles.removeButton}><Feather name="trash-2" size={16} color={colors.error} /></Pressable> : null}
            </Card>)}
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.md, borderWidth: 1.5, marginBottom: spacing.md },
  formTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.md },
  label: { color: colors.textSecondary, fontSize: fontSize.xs, fontWeight: '600', marginBottom: spacing.xs },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  kindChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  kindText: { color: colors.textSecondary, fontSize: fontSize.xs },
  error: { color: colors.error, fontSize: fontSize.xs, marginBottom: spacing.sm },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  filterText: { color: colors.textSecondary, fontSize: fontSize.xs },
  filterTextActive: { color: colors.white, fontWeight: '600' },
  emptyCard: { borderColor: '#D98219', borderWidth: 1.5 },
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center' },
  listCard: { borderWidth: 1.5, padding: spacing.sm, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  listPress: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  listIcon: { width: 38, height: 38, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  listCopy: { flex: 1, minWidth: 0 },
  listTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  listMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  removeButton: { padding: spacing.sm, marginLeft: spacing.xs },
});
