import React, { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { GiftIdea, giftService } from '@/src/services/coupleCategoryService';

export default function GiftsScreen() {
  const tone = getCategoryColor('hediye-radari'); const { user } = useAuth(); const couple = useCouple();
  const [rows, setRows] = useState<GiftIdea[]>([]); const [title, setTitle] = useState(''); const [url, setUrl] = useState(''); const [price, setPrice] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => { if (!couple.couple) return; try { setRows(await giftService.list()); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Hediye fikirleri yüklenemedi.'); } }, [couple.couple?.id]);
  useFocusEffect(useCallback(() => { void refresh(); const timer = setInterval(() => { void refresh(); }, 8000); return () => clearInterval(timer); }, [refresh]));
  const add = async () => { if (!user || !couple.couple || !title.trim()) return; setSaving(true); try { await giftService.add(user.id, couple.couple.id, title, url, price); setTitle(''); setUrl(''); setPrice(''); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Hediye fikri eklenemedi.'); } finally { setSaving(false); } };
  const remove = (gift: GiftIdea) => Alert.alert('Fikri kaldır', `“${gift.title}” kaldırılsın mı?`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Kaldır', style: 'destructive', onPress: async () => { try { await giftService.remove(gift.id); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Fikir kaldırılamadı.'); } } }]);
  if (couple.loading) return <Screen title="Hediye Radarı"><CoupleLoading /></Screen>;
  return <Screen title="Hediye Radarı">
    {!couple.couple ? <EmptyState icon="users" title="Önce eşleşin" description="Hediye fikirlerini güvenle saklamak için partnerinizle eşleşin." /> : <>
      <Text style={styles.intro}>Buraya eklediklerin yalnızca senin hesabında görünür; partnerin hediye fikirlerini göremez.</Text>
      <Card style={[styles.card, { borderColor: tone.color }]}><Text style={[styles.heading, { color: tone.color }]}>Yeni hediye fikri</Text><Input value={title} onChangeText={setTitle} placeholder="…" compact /><Input value={url} onChangeText={setUrl} placeholder="Bağlantı (isteğe bağlı)" autoCapitalize="none" keyboardType="url" compact /><Input value={price} onChangeText={setPrice} placeholder="Fiyat (isteğe bağlı)" keyboardType="decimal-pad" compact /><Button title="Fikri kaydet" icon="plus" toneColor={tone.color} onPress={() => { void add(); }} loading={saving} disabled={!title.trim()} compact /></Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {rows.length === 0 ? <EmptyState icon="gift" title="Henüz fikir yok" description="Aklına gelen hediye fikirlerini buraya kaydet." toneColor={tone.color} toneTint={tone.tint} /> : rows.map((gift) => <Card key={gift.id} style={[styles.row, { borderColor: tone.color }]}><View style={styles.copy}><Text style={styles.title}>{gift.title}</Text>{gift.price != null ? <Text style={styles.meta}>{gift.price.toLocaleString('tr-TR')} ₺</Text> : null}{gift.url ? <Pressable onPress={() => { void Linking.openURL(gift.url!); }}><Text style={[styles.link, { color: tone.color }]} numberOfLines={1}>Bağlantıyı aç</Text></Pressable> : null}</View><Pressable onPress={() => { void giftService.toggle(gift.id, !gift.is_purchased).then(refresh).catch((e) => setError(e.message)); }} hitSlop={8} accessibilityLabel={gift.is_purchased ? 'Alınmadı olarak işaretle' : 'Alındı olarak işaretle'}><Feather name={gift.is_purchased ? 'check-circle' : 'circle'} size={21} color={tone.color} /></Pressable><Pressable onPress={() => remove(gift)} hitSlop={8}><Feather name="trash-2" size={17} color={colors.error} /></Pressable></Card>)}
    </>}
  </Screen>;
}
const styles = StyleSheet.create({ intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md }, card: { borderWidth: 1, marginBottom: spacing.md }, heading: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm }, row: { borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, marginBottom: spacing.sm }, copy: { flex: 1 }, title: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' }, meta: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 2 }, link: { fontSize: fontSize.xs, marginTop: 4 }, error: { color: colors.error, marginBottom: spacing.sm } });
