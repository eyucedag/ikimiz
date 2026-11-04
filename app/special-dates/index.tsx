import React, { useCallback, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { ImportantDate, ImportantDateKind, importantDateService } from '@/src/services/importantDateService';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

const kinds: { value: ImportantDateKind; label: string }[] = [
  { value: 'anniversary', label: 'Yıl dönümü' },
  { value: 'birthday', label: 'Doğum günü' },
  { value: 'other', label: 'Diğer' },
];
const today = () => new Date().toISOString().slice(0, 10);
const toDate = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
const toKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateLabel = (value: string) => toDate(value).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

export default function SpecialDatesScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const appearance = useAppAppearance();
  const [items, setItems] = useState<ImportantDate[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [kind, setKind] = useState<ImportantDateKind>('other');
  const [editing, setEditing] = useState<ImportantDate | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(toDate(today()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const categoryColor = '#C03CA8';

  const refresh = useCallback(async () => {
    if (!couple.couple?.id) return;
    try { setItems(await importantDateService.list(couple.couple.id)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Özel günler yüklenemedi.'); }
  }, [couple.couple?.id]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const save = async () => {
    if (!user || !couple.couple || !couple.partner) return;
    setSaving(true); setError('');
    try {
      const item = await importantDateService.save({ id: editing?.id, ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id, title, date, kind });
      setItems((previous) => [...previous.filter((entry) => entry.id !== item.id), item].sort((a, b) => a.date.localeCompare(b.date)));
      setTitle(''); setDate(today()); setKind('other'); setEditing(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Özel gün kaydedilemedi.'); }
    finally { setSaving(false); }
  };

  const edit = (item: ImportantDate) => { setEditing(item); setTitle(item.title); setDate(item.date); setKind(item.kind); };
  const remove = (item: ImportantDate) => Alert.alert('Özel günü kaldır', `${item.title} kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await importantDateService.remove(item.id); setItems((previous) => previous.filter((entry) => entry.id !== item.id)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Özel gün kaldırılamadı.'); }
    } },
  ]);

  if (couple.loading) return <Screen title="Özel Günler"><CoupleLoading /></Screen>;

  return (
    <Screen title="Özel Günler" refreshing={false} onRefresh={refresh}>
      {!couple.isPaired ? <EmptyState icon="users" title="Önce eşleşin" description="Özel günlerinizi birlikte kaydetmek için partnerinizle eşleşin." /> : <>
        <Card style={styles.form}>
          <Text style={styles.formTitle}>{editing ? 'Özel günü düzenle' : 'Özel gün ekle'}</Text>
          <Input label="Özel gün" compact placeholder="Yıl dönümümüz" value={title} onChangeText={setTitle} />
          <Text style={styles.label}>Tür</Text>
          <View style={styles.kindRow}>
            {kinds.map((entry) => <Pressable key={entry.value} onPress={() => setKind(entry.value)} style={[styles.kindChip, kind === entry.value && { borderColor: categoryColor, backgroundColor: '#FBE3F5' }]}>
              <Text style={[styles.kindText, kind === entry.value && { color: categoryColor }]}>{entry.label}</Text>
            </Pressable>)}
          </View>
          <Text style={styles.label}>Tarih</Text>
          <Pressable onPress={() => { setDraftDate(toDate(date)); setPickerOpen(true); }} style={styles.dateButton} accessibilityRole="button">
            <Feather name="calendar" size={16} color={categoryColor} /><Text style={styles.dateText}>{dateLabel(date)}</Text>
          </Pressable>
          {pickerOpen && Platform.OS === 'android' ? <DateTimePicker value={draftDate} mode="date" display="default" onChange={(_, selected) => { if (selected) setDate(toKey(selected)); setPickerOpen(false); }} /> : null}
          <Modal transparent visible={pickerOpen && Platform.OS === 'ios'} animationType="slide" onRequestClose={() => setPickerOpen(false)}>
            <View style={styles.modalBackdrop}><View style={[styles.dateModal, { backgroundColor: appearance.surfaceColor }]}>
              <View style={styles.modalHeader}><Button title="Vazgeç" compact variant="ghost" onPress={() => setPickerOpen(false)} /><Text style={styles.formTitle}>Tarih seç</Text><Button title="Tamam" compact variant="ghost" toneColor={categoryColor} onPress={() => { setDate(toKey(draftDate)); setPickerOpen(false); }} /></View>
              <DateTimePicker value={draftDate} mode="date" display="spinner" locale="tr-TR" themeVariant="light" textColor={colors.text} onChange={(_, selected) => { if (selected) setDraftDate(selected); }} />
            </View></View>
          </Modal>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title={editing ? 'Değişiklikleri kaydet' : 'Özel günü ekle'} icon={editing ? 'save' : 'plus'} toneColor={categoryColor} compact loading={saving} onPress={() => { void save(); }} disabled={!title.trim()} />
          {editing ? <Button title="Vazgeç" variant="ghost" compact toneColor={categoryColor} onPress={() => { setEditing(null); setTitle(''); setDate(today()); setKind('other'); }} /> : null}
        </Card>
        <Text style={styles.listTitle}>Kaydedilen özel günler · {items.length}</Text>
        {items.length === 0 ? <Card style={styles.empty}><EmptyState compact icon="gift" title="Henüz özel gün eklenmedi" description="İkiniz için anlamlı tarihleri buraya kaydedin." /></Card> : items.map((item) => <Card key={item.id} style={styles.row}>
          <View style={styles.icon}><Feather name={item.kind === 'birthday' ? 'gift' : 'heart'} size={18} color={categoryColor} /></View>
          <View style={styles.copy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.itemMeta}>{dateLabel(item.date)} · {kinds.find((entry) => entry.value === item.kind)?.label}</Text></View>
          <Button title="Düzenle" icon="edit-2" compact variant="ghost" toneColor={categoryColor} onPress={() => edit(item)} />
          {item.ownerId === user?.id ? <Pressable onPress={() => remove(item)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Özel günü kaldır"><Feather name="trash-2" size={16} color={colors.error} /></Pressable> : null}
        </Card>)}
      </>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.md, marginBottom: spacing.md, borderColor: '#C03CA8', borderWidth: 1.5 },
  formTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#C03CA8' },
  label: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.xs },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  kindChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  kindText: { color: colors.textSecondary, fontSize: fontSize.xs },
  dateButton: { minHeight: 40, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dateText: { color: colors.text, fontSize: fontSize.sm },
  error: { color: colors.error, fontSize: fontSize.xs, marginBottom: spacing.sm },
  listTitle: { color: '#C03CA8', fontSize: fontSize.sm, fontWeight: '700', marginVertical: spacing.sm },
  empty: { padding: spacing.sm, borderColor: '#C03CA8', borderWidth: 1.5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, marginBottom: spacing.sm, borderColor: '#C03CA8', borderWidth: 1.5 },
  icon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FBE3F5', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  itemTitle: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  itemMeta: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  dateModal: { backgroundColor: colors.card, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingBottom: spacing.xl },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: spacing.sm },
});
