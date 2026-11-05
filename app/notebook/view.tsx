import React, { useCallback, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, IconButton, Screen } from '@/src/components/ui';
import { NotebookBody } from '@/src/components/NotebookBody';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useCouple } from '@/src/hooks/useCouple';
import { notebookService, NotebookNote } from '@/src/services/notebookService';
import { formatDateTime } from '@/src/utils/date';

export default function NotebookNoteViewScreen() {
  const router = useRouter();
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const couple = useCouple();
  const tone = getCategoryColor('notlar');
  const [note, setNote] = useState<NotebookNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!couple.couple?.id || !noteId) return;
    setLoading(true);
    try {
      const notes = await notebookService.list(couple.couple.id);
      setNote(notes.find((item) => item.id === noteId) ?? null);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Not açılamadı.'); }
    finally { setLoading(false); }
  }, [couple.couple?.id, noteId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  if (couple.loading || loading) return <Screen title="Not Defteri"><CoupleLoading /></Screen>;
  if (!note) return <Screen title="Not Defteri"><EmptyState icon="file-text" title="Not bulunamadı" description={error || 'Bu not kaldırılmış olabilir.'} /></Screen>;

  return <Screen title="Not Defteri" headerRight={<IconButton icon="edit-2" accessibilityLabel="Notu düzenle" onPress={() => router.push({ pathname: '/notebook/compose', params: { noteId: note.id } })} />}>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Card style={[styles.noteCard, { borderColor: tone.color }]}>
      <Text style={styles.title}>{note.title}</Text>
      <Text style={styles.updated}>{formatDateTime(note.updatedAt)}</Text>
      <View style={styles.rule} />
      <NotebookBody body={note.body} />
    </Card>
    <Button title="Düzenle" icon="edit-2" variant="secondary" toneColor={tone.color} onPress={() => router.push({ pathname: '/notebook/compose', params: { noteId: note.id } })} style={styles.editButton} />
  </Screen>;
}

const styles = StyleSheet.create({
  noteCard: { borderWidth: 1, padding: spacing.lg },
  title: { color: colors.text, fontSize: fontSize.xl, lineHeight: 30, fontWeight: '700' },
  updated: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: spacing.xs },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
  error: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm },
  editButton: { marginTop: spacing.md },
});
