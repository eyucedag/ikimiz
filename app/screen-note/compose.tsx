import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, noteColors, noteEmojis, radius, spacing } from '@/src/constants/theme';
import { useCouple } from '@/src/hooks/useCouple';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { SCREEN_NOTE_MAX_LENGTH } from '@/src/services/screenNoteService';

export default function ComposeNoteScreen() {
  const router = useRouter();
  const couple = useCouple();
  const { send } = useScreenNotes(couple);
  const [text, setText] = useState('');
  const [emoji, setEmoji] = useState(noteEmojis[0]);
  const [backgroundColor, setBackgroundColor] = useState(noteColors[0]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setError('');
    setSending(true);
    const result = await send({ text, emoji, backgroundColor });
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    Alert.alert('Not gönderildi', `${couple.partner?.displayName ?? 'Partneriniz'} notunuzu ana ekranında görecek.`, [
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
    <Screen title="Ekrana Not">
      {/* Canlı önizleme */}
      <View style={[styles.preview, { backgroundColor }]}>
        <Text style={styles.previewEmoji}>{emoji}</Text>
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

      <Text style={styles.label}>Emoji</Text>
      <View style={styles.optionRow}>
        {noteEmojis.map((e) => (
          <Pressable
            key={e}
            onPress={() => setEmoji(e)}
            style={[styles.emojiOption, e === emoji && styles.selected]}
            accessibilityRole="button"
            accessibilityState={{ selected: e === emoji }}
          >
            <Text style={styles.emojiText}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Arka plan</Text>
      <View style={styles.optionRow}>
        {noteColors.map((c) => (
          <Pressable
            key={c}
            onPress={() => setBackgroundColor(c)}
            style={[styles.colorOption, { backgroundColor: c }, c === backgroundColor && styles.selected]}
            accessibilityRole="button"
            accessibilityLabel="Arka plan rengi"
            accessibilityState={{ selected: c === backgroundColor }}
          >
            {c === backgroundColor ? <Feather name="check" size={16} color={colors.accent} /> : null}
          </Pressable>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="Gönder" icon="send" onPress={submit} loading={sending} disabled={!text.trim()} style={styles.send} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: radius.card, padding: spacing.lg, minHeight: 170, marginBottom: spacing.xl },
  previewEmoji: { fontSize: fontSize.xxxl, marginBottom: spacing.sm },
  previewInput: { flex: 1, fontSize: fontSize.lg, color: colors.text, lineHeight: 24, textAlignVertical: 'top', minHeight: 72 },
  counter: { alignSelf: 'flex-end', fontSize: fontSize.xs, color: colors.textTertiary },
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
  selected: { borderColor: colors.accent, borderWidth: 2 },
  error: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.md },
  send: { marginTop: spacing.sm },
});
