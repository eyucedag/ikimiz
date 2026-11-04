import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, noteColors, radius, spacing } from '@/src/constants/theme';
import { getCategoryColor } from '@/src/constants/categories';
import { useCouple } from '@/src/hooks/useCouple';
import { useAuth } from '@/src/hooks/useAuth';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { SCREEN_NOTE_MAX_LENGTH } from '@/src/services/screenNoteService';

export default function ComposeNoteScreen() {
  const categoryColor = getCategoryColor('ekrana-not');
  const router = useRouter();
  const { noteId } = useLocalSearchParams<{ noteId?: string }>();
  const couple = useCouple();
  const { user } = useAuth();
  const { notes, send, update } = useScreenNotes(couple);
  const [text, setText] = useState('');
  const [backgroundColor, setBackgroundColor] = useState(noteColors[0]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!noteId) return;
    const note = notes.find((item) => item.id === noteId && item.senderId === user?.id);
    if (note) {
      setText(note.text);
      setBackgroundColor(note.backgroundColor);
    }
  }, [noteId, notes, user?.id]);

  const submit = async () => {
    setError('');
    setSending(true);
    const result = noteId
      ? await update(noteId, text, backgroundColor)
      : await send({ text, emoji: '', backgroundColor });
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    Alert.alert(noteId ? 'Not güncellendi' : 'Not gönderildi', noteId ? 'Notunuz düzenlendi.' : `${couple.partner?.displayName ?? 'Partneriniz'} notunuzu ana ekranında görecek.`, [
      { text: 'Tamam', onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')) },
    ]);
  };

  if (!couple.loading && !couple.isPaired) {
    return (
      <Screen title="Ekrana Not">
        <EmptyState
          icon="edit-3"
          title="Önce partnerinizle eşleşin"
          description="Ekrana Not, eşleştiğiniz partnerinizin ana ekranında görünen kısa notlardır."
          actionLabel="Partner Davet Et"
          onAction={() => router.replace('/couple/invite')}
        />
      </Screen>
    );
  }

  return (
    <Screen title={noteId ? 'Notu Düzenle' : 'Ekrana Not'}>
      {/* Canlı önizleme */}
      <View style={[styles.preview, { backgroundColor, borderColor: categoryColor.color }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={`${couple.partner?.displayName ?? 'Partnerinize'} kısa bir not yazın…`}
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={SCREEN_NOTE_MAX_LENGTH}
          style={styles.previewInput}
          autoFocus
          accessibilityLabel="Not metni"
        />
        <Text style={styles.counter}>
          {text.length}/{SCREEN_NOTE_MAX_LENGTH}
        </Text>
      </View>

      <Text style={styles.keyboardHint}>Emoji eklemek için klavyenizdeki emoji tuşunu kullanın.</Text>
      <Text style={styles.label}>Arka plan</Text>
      <View style={styles.optionRow}>
        {noteColors.map((c) => (
          <Pressable
            key={c}
            onPress={() => setBackgroundColor(c)}
            style={[styles.colorOption, { backgroundColor: c, borderColor: categoryColor.color }, c === backgroundColor && styles.selected, c === backgroundColor && { borderColor: categoryColor.color }]}
            accessibilityRole="button"
            accessibilityLabel="Arka plan rengi"
            accessibilityState={{ selected: c === backgroundColor }}
          >
            {c === backgroundColor ? <Feather name="check" size={16} color={categoryColor.color} /> : null}
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={noteId ? 'Değişiklikleri Kaydet' : 'Gönder'} icon={noteId ? 'check' : 'send'} toneColor={categoryColor.color} onPress={submit} loading={sending} disabled={!text.trim()} style={styles.send} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: radius.card, borderWidth: 1.5, padding: spacing.lg, minHeight: 170, marginBottom: spacing.xl },
  previewInput: { flex: 1, fontSize: fontSize.lg, color: colors.text, lineHeight: 24, textAlignVertical: 'top', minHeight: 72 },
  counter: { alignSelf: 'flex-end', fontSize: fontSize.xs, color: colors.textTertiary },
  keyboardHint: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: spacing.sm },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: fontSize.xl },
  colorOption: { width: 44, height: 44, borderRadius: radius.control, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  selected: { borderWidth: 2 },
  error: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.md },
  send: { marginTop: spacing.sm },
});
