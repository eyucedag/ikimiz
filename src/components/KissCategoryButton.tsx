import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { getKissPeriod, KissPeriod, KissRecord, kissService } from '@/src/services/kissService';

interface Props {
  ownerId?: string;
  partnerId?: string;
  coupleId?: string;
}

function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function KissCategoryButton({ ownerId, partnerId, coupleId }: Props) {
  const [records, setRecords] = useState<KissRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const paired = !!ownerId && !!partnerId && !!coupleId;

  const refresh = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      setRecords(await kissService.listToday(ownerId));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Öpücük durumu yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const currentPeriod = getKissPeriod();
  const today = localDate();
  const used = useMemo(
    () => new Set(records.filter((record) => record.localDate === today).map((record) => record.period)),
    [records, today],
  );
  const alreadySent = used.has(currentPeriod);

  const send = async () => {
    if (!ownerId || !partnerId || !coupleId || sending || alreadySent) return;
    setSending(true);
    setNotice('');
    setError('');
    try {
      const record = await kissService.send({ ownerId, partnerId, coupleId });
      setRecords((previous) => [...previous.filter((item) => item.id !== record.id), record]);
      setNotice(currentPeriod === 'morning' ? 'Sabah öpücüğünüz partnerinize gitti 💋' : 'Akşam öpücüğünüz partnerinize gitti 💋');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Öpücük gönderilemedi. Lütfen yeniden deneyin.');
      void refresh();
    } finally {
      setSending(false);
    }
  };

  const status = (period: KissPeriod, label: string) => `${label} ${used.has(period) ? '✓' : '○'}`;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={send}
        disabled={!paired || loading || sending || alreadySent}
        accessibilityRole="button"
        accessibilityLabel="Partnerinize öpücük gönder"
        accessibilityState={{ disabled: !paired || loading || sending || alreadySent }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed, (!paired || alreadySent) && styles.disabled]}
      >
        {sending || loading ? <ActivityIndicator color={styles.lips.color} /> : <Text style={styles.lips}>💋</Text>}
      </Pressable>
      <Text style={styles.title}>Öpücük</Text>
      <Text style={styles.usage}>{status('morning', 'Sabah')}  ·  {status('evening', 'Akşam')}</Text>
      {!paired ? <Text style={styles.message}>Öpücük göndermek için partnerinizle eşleşin.</Text> : null}
      {notice ? <Text style={styles.success}>{notice}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.lg, paddingVertical: spacing.lg },
  button: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0F3', borderWidth: 3, borderColor: '#F12E51', shadowColor: '#D91F46', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  lips: { color: '#E5163D', fontSize: 60, lineHeight: 70 },
  title: { marginTop: spacing.md, color: '#C51E3A', fontSize: fontSize.xl, fontWeight: '800' },
  usage: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: fontSize.sm, fontWeight: '600' },
  message: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center' },
  success: { marginTop: spacing.xs, color: '#B51F4C', fontSize: fontSize.xs, textAlign: 'center' },
  error: { marginTop: spacing.xs, color: colors.error, fontSize: fontSize.xs, textAlign: 'center' },
  disabled: { opacity: 0.55 },
  pressed: { transform: [{ scale: 0.93 }] },
});
