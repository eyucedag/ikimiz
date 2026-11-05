import React, { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { factService, PartnerFact } from '@/src/services/coupleCategoryService';

export default function FactsScreen() {
  const tone = getCategoryColor('bilinmesi-gerekenler'); const { user } = useAuth(); const couple = useCouple();
  const [rows, setRows] = useState<PartnerFact[]>([]); const [label, setLabel] = useState(''); const [value, setValue] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const refresh = useCallback(async () => { if (!couple.couple) return; try { setRows(await factService.list(couple.couple.id)); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Bilgiler yüklenemedi.'); } }, [couple.couple?.id]);
  useFocusEffect(useCallback(() => { void refresh(); const timer = setInterval(() => { void refresh(); }, 8000); return () => clearInterval(timer); }, [refresh]));
  const add = async () => { if (!user || !couple.couple || !couple.partner || !label.trim()) return; setSaving(true); try { await factService.add(user.id, couple.couple.id, couple.partner.id, label, value); setLabel(''); setValue(''); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Bilgi eklenemedi.'); } finally { setSaving(false); } };
  const remove = (fact: PartnerFact) => Alert.alert('Bilgiyi kaldır', `“${fact.label}” kaldırılsın mı?`, [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Kaldır', style: 'destructive', onPress: async () => { try { await factService.remove(fact.id); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Bilgi kaldırılamadı.'); } } }]);
  if (couple.loading) return <Screen title="Bilinmesi Gerekenler"><CoupleLoading /></Screen>;
  return <Screen title="Bilinmesi Gerekenler">
    {!couple.couple ? <EmptyState icon="users" title="Önce eşleşin" description="Ortak bilgileri görmek için partnerinizle eşleşin." /> : <>
      <Card style={[styles.card, { borderColor: tone.color }]}><Text style={[styles.heading, { color: tone.color }]}>Yeni bilgi</Text><Input value={label} onChangeText={setLabel} placeholder="Başlık · ör. Alerjiler" compact /><Input value={value} onChangeText={setValue} placeholder="Bilgi" multiline compact style={styles.value} /><Button title="Bilgiyi kaydet" icon="plus" toneColor={tone.color} onPress={() => { void add(); }} loading={saving} disabled={!label.trim()} compact /></Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {rows.length === 0 ? <EmptyState icon="heart" title="Henüz bilgi yok" description="Önemli tercihleri ve bilgileri ikiniz için kaydedin." toneColor={tone.color} toneTint={tone.tint} /> : rows.map((fact) => <Card key={fact.id} style={[styles.row, { borderColor: tone.color }]}><View style={[styles.icon, { backgroundColor: tone.tint }]}><Feather name="heart" size={17} color={tone.color} /></View><View style={styles.copy}><Text style={styles.title}>{fact.label}</Text>{fact.value ? <Text style={styles.detail}>{fact.value}</Text> : null}</View><Button title="" icon="trash-2" variant="ghost" toneColor={colors.error} onPress={() => remove(fact)} compact /></Card>)}
    </>}
  </Screen>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1.5, marginBottom: spacing.md }, heading: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm }, value: { minHeight: 72, textAlignVertical: 'top' }, row: { borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, marginBottom: spacing.sm }, icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, title: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' }, detail: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: 3 }, error: { color: colors.error, marginBottom: spacing.sm } });
