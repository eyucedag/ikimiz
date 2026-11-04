import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Card, CoupleLoading, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { CoupleSteps, presenceService } from '@/src/services/presenceService';
import { supabase } from '@/src/lib/supabase';
import { getCategoryColor } from '@/src/constants/categories';

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function StepsScreen() {
  const categoryColor = getCategoryColor('birlikte-adimlar');
  const { user } = useAuth();
  const couple = useCouple();
  const [rows, setRows] = useState<CoupleSteps[]>([]);
  const [error, setError] = useState('');
  const today = localDate();

  const refresh = useCallback(async () => {
    if (!couple.couple?.id) return;
    try { setRows(await presenceService.steps(couple.couple.id, today)); setError(''); }
    catch { setError('Adım tablosu açılamadı. Uygulamayı güncelleyip Supabase SQL kurulumunu kontrol edin.'); }
  }, [couple.couple?.id, today]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = presenceService.channel(coupleId, 'couple_daily_steps', () => { void refresh(); });
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, refresh]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.steps, 0), [rows]);
  if (couple.loading) return <Screen title="Birlikte Atılan Adımlar"><CoupleLoading /></Screen>;
  if (!couple.couple) return <Screen title="Birlikte Atılan Adımlar"><EmptyState icon="users" title="Önce eşleşin" description="Ortak adım sayacı partnerinizle eşleşince kullanılabilir." /></Screen>;

  return (
    <Screen title="Birlikte Atılan Adımlar">
      <Card style={[styles.hero, { borderColor: categoryColor.color }]}>
        <View style={[styles.icon, { backgroundColor: categoryColor.tint }]}><Feather name="activity" size={22} color={categoryColor.color} /></View>
        <Text style={[styles.total, { color: categoryColor.color }]}>{total.toLocaleString('tr-TR')}</Text>
        <Text style={styles.caption}>bugün birlikte atılan adım</Text>
        <Text style={styles.detail}>Uygulama açıkken ve ikiniz 40 metre yakınken telefonların adım sensörü otomatik sayar. Konum ve hareket izinleri gerekir.</Text>
      </Card>
      <Card style={[styles.rows, { borderColor: categoryColor.color }]}>
        {[{ id: user?.id, name: 'Sen' }, { id: couple.partner?.id, name: couple.partner?.displayName ?? 'Partnerin' }].map((person) => {
          const count = rows.find((row) => row.userId === person.id)?.steps ?? 0;
          return <View key={person.id} style={styles.personRow}><Text style={styles.person}>{person.name}</Text><Text style={[styles.count, { color: categoryColor.color }]}>{count.toLocaleString('tr-TR')}</Text></View>;
        })}
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xl, borderWidth: 1.5 },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: 40, fontWeight: '800', marginTop: spacing.sm },
  caption: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  detail: { color: colors.textSecondary, textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.md, lineHeight: 20 },
  rows: { marginTop: spacing.md, paddingVertical: 0, borderWidth: 1.5 },
  personRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  person: { color: colors.text, fontSize: fontSize.md }, count: { fontSize: fontSize.md, fontWeight: '700' },
  error: { color: colors.error, marginTop: spacing.sm },
});
