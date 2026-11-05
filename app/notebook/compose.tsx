import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, TextInputInstance, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, CoupleLoading, EmptyState, Screen } from '@/src/components/ui';
import { NotebookBody } from '@/src/components/NotebookBody';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { notebookService } from '@/src/services/notebookService';

type Selection = { start: number; end: number };

export default function NotebookComposeScreen() {
  const router = useRouter();
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const { user } = useAuth();
  const couple = useCouple();
  const tone = getCategoryColor('notlar');
  const inputRef = useRef<TextInputInstance>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!noteId || !couple.couple?.id) return;
    let active = true;
    setLoading(true);
    void notebookService.list(couple.couple.id).then((notes) => {
      const note = notes.find((item) => item.id === noteId);
      if (!active) return;
      if (note) { setTitle(note.title); setBody(note.body); setSelection({ start: 0, end: 0 }); }
      else setError('Bu not bulunamadı.');
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Not açılamadı.'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [noteId, couple.couple?.id]);

  const applyWrap = (marker: '**' | '*') => {
    const start = Math.min(selection.start, selection.end);
    const end = Math.max(selection.start, selection.end);
    const selected = body.slice(start, end);
    const replacement = selected ? `${marker}${selected}${marker}` : `${marker}${marker}`;
    const next = `${body.slice(0, start)}${replacement}${body.slice(end)}`;
    const cursor = selected ? start + replacement.length : start + marker.length;
    setBody(next);
    setSelection({ start: cursor, end: cursor });
    requestAnimationFrame(() => inputRef.current?.setNativeProps({ selection: { start: cursor, end: cursor } }));
    inputRef.current?.focus();
  };

  const applyBullet = () => {
    const start = Math.min(selection.start, selection.end);
    const lineStart = body.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const lineEndRaw = body.indexOf('\n', start);
    const lineEnd = lineEndRaw < 0 ? body.length : lineEndRaw;
    const line = body.slice(lineStart, lineEnd);
    const remove = /^\s*[-*]\s+/.test(line);
    const replacement = remove ? line.replace(/^\s*[-*]\s+/, '') : `- ${line}`;
    const next = `${body.slice(0, lineStart)}${replacement}${body.slice(lineEnd)}`;
    const offset = replacement.length - line.length;
    setBody(next);
    const cursor = Math.max(lineStart, selection.end + offset);
    setSelection({ start: cursor, end: cursor });
    requestAnimationFrame(() => inputRef.current?.setNativeProps({ selection: { start: cursor, end: cursor } }));
    inputRef.current?.focus();
  };

  const save = async () => {
    if (!user || !couple.couple || !couple.partner) return;
    setSaving(true); setError('');
    try {
      await notebookService.save({ id: noteId, ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id, title, body });
      Alert.alert(noteId ? 'Not güncellendi' : 'Not kaydedildi', 'Değişiklikleriniz partnerinizle paylaşıldı.', [
        { text: 'Tamam', onPress: () => (router.canGoBack() ? router.back() : router.replace('/notebook')) },
      ]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Not kaydedilemedi.'); }
    finally { setSaving(false); }
  };

  if (couple.loading || loading) return <Screen title="Not Defteri"><CoupleLoading /></Screen>;
  if (!couple.isPaired || !couple.couple) return <Screen title="Not Defteri"><EmptyState icon="users" title="Önce eşleşin" description="Ortak not yazmak için önce partnerinizle eşleşin." /></Screen>;

  return <Screen title={noteId ? 'Notu Düzenle' : 'Not Defteri'}>
    <View style={[styles.editorCard, { borderColor: tone.color }]}>
      <TextInput value={title} onChangeText={setTitle} placeholder="Başlık…" placeholderTextColor={colors.textTertiary}
        style={styles.titleInput} accessibilityLabel="Not başlığı" returnKeyType="next" onSubmitEditing={() => inputRef.current?.focus()} />
      <View style={[styles.toolbar, { borderColor: tone.tint }]} accessibilityLabel="Metin biçimlendirme araçları">
        <Pressable onPress={() => applyWrap('**')} style={styles.tool} accessibilityRole="button" accessibilityLabel="Seçili metni kalın yap"><Text style={styles.boldTool}>B</Text></Pressable>
        <Pressable onPress={() => applyWrap('*')} style={styles.tool} accessibilityRole="button" accessibilityLabel="Seçili metni italik yap"><Text style={styles.italicTool}>I</Text></Pressable>
        <View style={[styles.toolDivider, { backgroundColor: tone.tint }]} />
        <Pressable onPress={applyBullet} style={styles.tool} accessibilityRole="button" accessibilityLabel="Madde işaretli liste ekle"><Text style={styles.bulletTool}>•</Text><Text style={styles.bulletLabel}>Liste</Text></Pressable>
        <Text style={styles.toolbarHint}>Metni seçip biçim verin</Text>
      </View>
      <TextInput ref={inputRef} value={body} onChangeText={setBody} onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        placeholder="Notunuzu buraya yazın…" placeholderTextColor={colors.textTertiary} multiline textAlignVertical="top"
        style={styles.bodyInput} accessibilityLabel="Not içeriği" />
      {body ? <View style={[styles.preview, { borderColor: tone.tint }]}><Text style={styles.previewLabel}>Önizleme</Text><NotebookBody body={body} /></View> : null}
    </View>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Button title={noteId ? 'Değişiklikleri kaydet' : 'Notu kaydet'} icon="save" toneColor={tone.color} onPress={() => { void save(); }} loading={saving} disabled={!title.trim() || !body.trim()} style={styles.saveButton} />
  </Screen>;
}

const styles = StyleSheet.create({
  editorCard: { borderWidth: 1.5, borderRadius: radius.card, backgroundColor: colors.card, padding: spacing.md, minHeight: 510 },
  titleInput: { minHeight: 52, fontSize: fontSize.lg, fontWeight: '700', color: colors.text, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingVertical: spacing.sm },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, paddingVertical: spacing.sm },
  tool: { minWidth: 36, height: 34, borderRadius: radius.control, backgroundColor: colors.beige, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs },
  boldTool: { fontSize: fontSize.md, fontWeight: '900', color: colors.text },
  italicTool: { fontSize: fontSize.md, fontWeight: '600', fontStyle: 'italic', color: colors.text },
  bulletTool: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text, lineHeight: 22 },
  bulletLabel: { color: colors.text, fontSize: fontSize.xs },
  toolDivider: { width: 1, height: 22 },
  toolbarHint: { flex: 1, color: colors.textTertiary, fontSize: 10, textAlign: 'right' },
  bodyInput: { minHeight: 330, fontSize: fontSize.md, color: colors.text, lineHeight: 24, paddingTop: spacing.md },
  preview: { borderTopWidth: 1, paddingTop: spacing.sm, marginTop: spacing.sm },
  previewLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.xs },
  error: { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.sm },
  saveButton: { marginTop: spacing.md },
});
