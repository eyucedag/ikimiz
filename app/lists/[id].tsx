import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { supabase } from '@/src/lib/supabase';
import { listService, SharedList, SharedListItem } from '@/src/services/listService';

export default function SharedListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const listId = Array.isArray(id) ? id[0] : id;
  const { user } = useAuth();
  const couple = useCouple();
  const listColor = getCategoryColor('listeler');
  const [list, setList] = useState<SharedList | null>(null);
  const [items, setItems] = useState<SharedListItem[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async (silent = false) => {
    if (!couple.couple?.id || !listId) return;
    if (!silent) setLoading(true);
    try {
      const [nextList, nextItems] = await Promise.all([listService.get(listId, couple.couple.id), listService.items(listId, couple.couple.id)]);
      setList(nextList); setItems(nextItems); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Liste yüklenemedi.'); }
    finally { if (!silent) setLoading(false); }
  }, [couple.couple?.id, listId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId || !listId) return;
    const channel = supabase.channel(`list-items-${listId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` }, () => { void refresh(true); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `id=eq.${listId}` }, () => { void refresh(true); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, listId, refresh]);

  const addItem = async () => {
    if (!user || !couple.couple || !couple.partner || !listId) return;
    setAdding(true); setError('');
    try {
      const item = await listService.addItem({ ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id, listId, content, position: items.length });
      setItems((current) => [...current, item]); setContent('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Madde eklenemedi.'); }
    finally { setAdding(false); }
  };

  const toggle = async (item: SharedListItem) => {
    if (!user || !couple.couple || !couple.partner) return;
    setSavingItemId(item.id); setError('');
    try {
      const updated = await listService.toggleItem({ item, userId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id });
      setItems((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
    } catch (e) { setError(e instanceof Error ? e.message : 'Madde güncellenemedi.'); }
    finally { setSavingItemId(null); }
  };

  const removeItem = (item: SharedListItem) => Alert.alert('Maddeyi kaldır', `${item.content} kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await listService.removeItem(item.id); setItems((current) => current.filter((entry) => entry.id !== item.id)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Madde kaldırılamadı.'); }
    } },
  ]);

  const checkedCount = items.filter((item) => item.isChecked).length;

  if (couple.loading) return <Screen title="Liste" toneColor={listColor.color}><CoupleLoading /></Screen>;
  if (!couple.isPaired) return <Screen title="Liste" toneColor={listColor.color}><EmptyState icon="users" toneColor={listColor.color} toneTint={listColor.tint} title="Önce eşleşin" description="Ortak listeleri görmek için partnerinizle eşleşin." /></Screen>;

  return (
    <Screen title={list?.title ?? 'Liste'} toneColor={listColor.color} refreshing={loading} onRefresh={() => { void refresh(); }}>
      {loading ? <CoupleLoading /> : !list ? <EmptyState icon="list" toneColor={listColor.color} toneTint={listColor.tint} title="Liste bulunamadı" description={error || 'Bu liste kaldırılmış olabilir.'} /> : <>
        <View style={styles.summary}>
          <View style={[styles.summaryIcon, { backgroundColor: listColor.tint }]}><Feather name="list" size={20} color={listColor.color} /></View>
          <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>{checkedCount}/{items.length} tamamlandı</Text><Text style={styles.summaryHint}>{list.title}</Text></View>
        </View>

        <Card style={[styles.addCard, { borderColor: listColor.color }]}>
          <Input label="Yeni madde" compact placeholder="…" value={content} onChangeText={setContent} onSubmitEditing={() => { void addItem(); }} returnKeyType="done" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Madde ekle" icon="plus" toneColor={listColor.color} compact onPress={() => { void addItem(); }} loading={adding} disabled={!content.trim()} />
        </Card>

        {items.length === 0 ? <Card style={styles.emptyCard}><EmptyState compact icon="check-square" toneColor={listColor.color} toneTint={listColor.tint} title="Liste boş" description="İlk maddeyi ekleyin; partneriniz de anında görecek." /></Card> : <Card style={[styles.itemsCard, { borderColor: listColor.color }]}>
          {items.map((item, index) => <View key={item.id} style={[styles.itemRow, index > 0 && styles.itemDivider]}>
            <Pressable onPress={() => { void toggle(item); }} accessibilityRole="checkbox" accessibilityState={{ checked: item.isChecked, busy: savingItemId === item.id }} style={styles.checkPress}>
              {savingItemId === item.id ? <ActivityIndicator size="small" color={listColor.color} /> : <View style={[styles.checkbox, item.isChecked && { backgroundColor: listColor.color, borderColor: listColor.color }]}>{item.isChecked ? <Feather name="check" size={14} color={colors.white} /> : null}</View>}
            </Pressable>
            <Pressable onPress={() => { void toggle(item); }} style={styles.itemTextWrap} accessibilityRole="button" accessibilityLabel={`${item.content}, ${item.isChecked ? 'tamamlandı' : 'tamamlanmadı'}`}>
              <Text style={[styles.itemText, item.isChecked && styles.itemTextChecked]}>{item.content}</Text>
            </Pressable>
            {item.ownerId === user?.id ? <Pressable onPress={() => removeItem(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${item.content} maddesini kaldır`} style={styles.deleteButton}><Feather name="trash-2" size={15} color={colors.error} /></Pressable> : null}
          </View>)}
        </Card>}
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  summaryIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '700' },
  summaryHint: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  addCard: { padding: spacing.md, borderWidth: 1, marginBottom: spacing.md },
  error: { color: colors.error, fontSize: fontSize.xs, marginBottom: spacing.sm },
  emptyCard: { borderWidth: 1 },
  itemsCard: { borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  itemRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.sm },
  itemDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  checkPress: { width: 30, height: 38, alignItems: 'center', justifyContent: 'center' },
  checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  itemTextWrap: { flex: 1, justifyContent: 'center', minHeight: 38 },
  itemText: { color: colors.text, fontSize: fontSize.sm },
  itemTextChecked: { color: colors.textTertiary, textDecorationLine: 'line-through' },
  deleteButton: { padding: spacing.sm },
});
