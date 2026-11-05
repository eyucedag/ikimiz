import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { getCategoryColor } from '@/src/constants/categories';
import { kissService } from '@/src/services/kissService';

interface Props {
  ownerId?: string;
  partnerId?: string;
  coupleId?: string;
}

export function KissCategoryButton({ ownerId, partnerId, coupleId }: Props) {
  const tone = getCategoryColor('opucuk');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const paired = !!ownerId && !!partnerId && !!coupleId;

  const send = async () => {
    if (!ownerId || !partnerId || !coupleId || sending) return;
    setSending(true);
    setNotice('');
    setError('');
    try {
      await kissService.send({ ownerId, partnerId, coupleId });
      setNotice('Öpücüğün partnerine gitti');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Öpücük gönderilemedi. Lütfen yeniden deneyin.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={send}
        disabled={!paired || sending}
        accessibilityRole="button"
        accessibilityLabel="Partnerinize öpücük gönder"
        accessibilityState={{ disabled: !paired || sending }}
        style={({ pressed }) => [styles.button, { backgroundColor: tone.tint, borderColor: tone.color, shadowColor: tone.color }, pressed && styles.pressed, !paired && styles.disabled]}
      >
        {sending ? <ActivityIndicator color={tone.color} /> : <Text style={[styles.lips, { color: tone.color }]}>💋</Text>}
      </Pressable>
      <Text style={[styles.title, { color: tone.color }]}>Öpücük</Text>
      <Text style={styles.usage}>Ne zaman istersen 💖</Text>
      {!paired ? <Text style={styles.message}>Öpücük göndermek için partnerinizle eşleşin.</Text> : null}
      {notice ? <Text style={[styles.success, { color: tone.color }]}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg, paddingVertical: spacing.lg },
  button: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 },
  lips: { fontSize: 60, lineHeight: 70 },
  title: { marginTop: spacing.md, fontSize: fontSize.xl, fontWeight: '800' },
  usage: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  message: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center' },
  success: { marginTop: spacing.xs, fontSize: fontSize.xs, textAlign: 'center' },
  error: { marginTop: spacing.xs, color: colors.error, fontSize: fontSize.xs, textAlign: 'center' },
  disabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.93 }] },
});
