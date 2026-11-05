import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Screen } from '@/src/components/ui';
import { NotebookBody } from '@/src/components/NotebookBody';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { notebookService, NotebookNote } from '@/src/services/notebookService';
import { formatDateTime } from '@/src/utils/date';

export default function NotebookScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const tone = getCategoryColor('notlar');
  const [notes, setNotes] = useState<NotebookNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (showLoading = true) => {
    if (!couple.couple?.id) return;
    if (showLoading) setLoading(true);
    try { setNotes(await notebookService.list(couple.couple.id)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Not Defteri yüklenemedi.'); }
    finally { if (showLoading) setLoading(false); }
  }, [couple.couple?.id]);

  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => { void refresh(false); }, 5000);
    return () => clearInterval(timer);
  }, [refresh]));

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(false); } finally { setRefreshing(false); }
  };

  const remove = (note: NotebookNote) => Alert.alert('Notu kaldır', `“${note.title}” Not Defteri’nden kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await notebookService.remove(note.id); setNotes((current) => current.filter((item) => item.id !== note.id)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Not kaldırılamadı.'); }
    } },
  ]);

  if (couple.loading) return <Screen title="Not Defteri"><CoupleLoading /></Screen>;

  return <Screen title="Not Defteri" refreshing={refreshing || loading} onRefresh={() => { void onRefresh(); }}>
    {!couple.isPaired || !couple.couple ? <EmptyState icon="users" title="Önce eşleşin" description="Not Defteri’ni partnerinizle ortak kullanmak için önce eşleşin." /> : <>
      <Text style={[styles.intro, { color: tone.color }]}>Önemli bilgileri ve kayıtları birlikte saklayın.</Text>
      <Button title="Yeni Not" icon="plus" toneColor={tone.color} onPress={() => router.push('/notebook/compose')} style={styles.newNoteButton} />
      <Text style={[styles.sectionTitle, { color: tone.color }]}>Mevcut Notlar</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && notes.length === 0 ? null : notes.length === 0 ? <Card style={[styles.emptyCard, { borderColor: tone.color }]}>
        <EmptyState compact icon="file-text" title="Not Defteri boş" description="Resmi ve önemli bilgilerinizi burada ortak kaydedebilirsiniz." toneColor={tone.color} toneTint={tone.tint}
          actionLabel="İlk notu ekle" onAction={() => router.push('/notebook/compose')} />
      </Card> : notes.map((note) => <Card key={note.id} style={[styles.noteCard, { borderColor: tone.color }]}>
        <View style={styles.cardHeading}>
          <Pressable onPress={() => router.push({ pathname: '/notebook/view', params: { noteId: note.id } })} accessibilityRole="button" accessibilityLabel={`${note.title} notunu oku`} style={styles.titlePress}>
            <Text style={styles.title}>{note.title}</Text>
          </Pressable>
          <Pressable onPress={() => router.push({ pathname: '/notebook/compose', params: { noteId: note.id } })} accessibilityRole="button" accessibilityLabel={`${note.title} notunu düzenle`} style={styles.editAction}>
            <Feather name="edit-2" size={14} color={tone.color} /><Text style={[styles.editLabel, { color: tone.color }]}>Düzenle</Text>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push({ pathname: '/notebook/view', params: { noteId: note.id } })} accessibilityRole="button" accessibilityLabel={`${note.title} notunun tamamını oku`}>
          <View style={styles.body}><NotebookBody body={note.body} numberOfLines={3} /></View>
          <Text style={styles.meta}>{formatDateTime(note.updatedAt)}</Text>
        </Pressable>
        {note.ownerId === user?.id ? <Pressable onPress={() => remove(note)} accessibilityRole="button" accessibilityLabel={`${note.title} notunu kaldır`} hitSlop={10} style={styles.delete}>
          <Feather name="trash-2" size={15} color={colors.error} />
        </Pressable> : null}
      </Card>)}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { fontSize: fontSize.sm, marginBottom: spacing.md },
  newNoteButton: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  error: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.md },
  emptyCard: { borderWidth: 1.5 },
  noteCard: { borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.sm },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titlePress: { flex: 1 },
  editAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  editLabel: { fontSize: fontSize.xs, fontWeight: '600' },
  title: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  body: { marginTop: spacing.sm, maxHeight: 72, overflow: 'hidden' },
  meta: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.sm },
  delete: { position: 'absolute', right: spacing.md, bottom: spacing.md, padding: spacing.xs, backgroundColor: colors.card },
});
