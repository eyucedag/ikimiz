import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, noteColors, radius, spacing } from '@/src/constants/theme';
import { getCategoryColor } from '@/src/constants/categories';
import { useCouple } from '@/src/hooks/useCouple';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { SCREEN_NOTE_MAX_LENGTH } from '@/src/services/screenNoteService';

export default function ComposeNoteScreen() {
  const categoryColor = getCategoryColor('ekrana-not');
  const router = useRouter();
  const couple = useCouple();
  const { send } = useScreenNotes(couple);
  const [text, setText] = useState('');
  const [stickerUri, setStickerUri] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState(noteColors[0]);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setError('');
    setSending(true);
    const result = await send({ text, emoji: '', backgroundColor, stickerUri });
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    Alert.alert('Not gönderildi', `${couple.partner?.displayName ?? 'Partneriniz'} notunuzu ana ekranında görecek.`, [
      { text: 'Tamam', onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)')) },
    ]);
  };

  const addSticker = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Fotoğraf izni gerekli', 'Sticker olarak kullanacağınız görseli seçmek için fotoğraf izni verin.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82 });
    if (!result.canceled && result.assets[0]) setStickerUri(result.assets[0].uri);
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
        {stickerUri ? <Image source={{ uri: stickerUri }} style={styles.stickerPreview} resizeMode="contain" /> : null}
      </View>

      <Text style={styles.keyboardHint}>Emoji eklemek için klavyenizdeki emoji tuşunu kullanın.</Text>
      <Button title={stickerUri ? 'Sticker görselini değiştir' : 'Sticker ekle'} icon="image" variant="secondary" onPress={() => { void addSticker(); }} style={styles.stickerButton} />

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
      <Button title="Gönder" icon="send" toneColor={categoryColor.color} onPress={submit} loading={sending} disabled={!text.trim()} style={styles.send} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { borderRadius: radius.card, borderWidth: 1.5, padding: spacing.lg, minHeight: 170, marginBottom: spacing.xl },
  previewInput: { flex: 1, fontSize: fontSize.lg, color: colors.text, lineHeight: 24, textAlignVertical: 'top', minHeight: 72 },
  counter: { alignSelf: 'flex-end', fontSize: fontSize.xs, color: colors.textTertiary },
  keyboardHint: { color: colors.textSecondary, fontSize: fontSize.sm, marginBottom: spacing.sm },
  stickerButton: { marginBottom: spacing.lg },
  stickerPreview: { width: 120, height: 120, alignSelf: 'center', marginTop: spacing.sm },
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
