import { useCouplePresence } from '@/src/hooks/useCouplePresence';
import { useLocalDate } from '@/src/hooks/useLocalDate';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { Card, CoupleLoading, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { CoupleSteps, presenceService } from '@/src/services/presenceService';
import { supabase } from '@/src/lib/supabase';
import { getCategoryColor } from '@/src/constants/categories';

export default function StepsScreen() {
  const categoryColor = getCategoryColor('birlikte-adimlar');
  const { user } = useAuth();
  const couple = useCouple();
  const { stepsError } = useCouplePresence();
  const [rows, setRows] = useState<CoupleSteps[]>([]);
  const [error, setError] = useState('');
  const today = useLocalDate();

  const refresh = useCallback(async () => {
    if (!couple.couple?.id) return;
    try {
      setRows(await presenceService.steps(couple.couple.id));
      setError('');
    } catch {
      setError('Adım tablosu açılamadı. Uygulamayı güncelleyip Supabase SQL kurulumunu kontrol edin.');
    }
  }, [couple.couple?.id]);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = presenceService.channel(coupleId, 'couple_daily_steps', () => {
      void refresh();
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [couple.couple?.id, refresh]);

  const todayRows = useMemo(() => rows.filter((row) => row.localDate === today), [rows, today]);
  const todayTotal = useMemo(() => todayRows.reduce((sum, row) => sum + row.steps, 0), [todayRows]);
  const allTimeTotal = useMemo(() => rows.reduce((sum, row) => sum + row.steps, 0), [rows]);
  if (couple.loading)
    return (
      <Screen title="Birlikte Atılan Adımlar" toneColor={categoryColor.color}>
        <CoupleLoading />
      </Screen>
    );
  if (!couple.couple)
    return (
      <Screen title="Birlikte Atılan Adımlar" toneColor={categoryColor.color}>
        <EmptyState
          icon="users"
          toneColor={categoryColor.color}
          toneTint={categoryColor.tint}
          title="Önce eşleşin"
          description="Ortak adım sayacı partnerinizle eşleşince kullanılabilir."
        />
      </Screen>
    );

  return (
    <Screen title="Birlikte Atılan Adımlar" toneColor={categoryColor.color}>
      <Card style={[styles.hero, { borderColor: categoryColor.color }]}>
        <View style={[styles.icon, { backgroundColor: categoryColor.tint }]}>
          <Feather name="activity" size={22} color={categoryColor.color} />
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.total, { color: categoryColor.color }]}>
              {todayTotal.toLocaleString('tr-TR')}
            </Text>
            <Text style={styles.caption}>Bugün</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.total, { color: categoryColor.color }]}>
              {allTimeTotal.toLocaleString('tr-TR')}
            </Text>
            <Text style={styles.caption}>Toplam birlikte</Text>
          </View>
        </View>
        <Text style={styles.detail}>
          Uygulama açıkken ve ikiniz 40 metre yakınken telefonların adım sensörü otomatik sayar. Konum ve
          hareket izinleri gerekir.
        </Text>
      </Card>
      <Card style={[styles.rows, { borderColor: categoryColor.color }]}>
        {[
          { id: user?.id, name: 'Sen' },
          { id: couple.partner?.id, name: couple.partner?.displayName ?? 'Partnerin' },
        ].map((person) => {
          const count = todayRows.find((row) => row.userId === person.id)?.steps ?? 0;
          return (
            <View key={person.id} style={styles.personRow}>
              <Text style={styles.person}>{person.name}</Text>
              <Text style={[styles.count, { color: categoryColor.color }]}>
                {count.toLocaleString('tr-TR')}
              </Text>
            </View>
          );
        })}
      </Card>
      {error || stepsError ? <Text style={styles.error}>{error || stepsError}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xl, borderWidth: 1 },
  icon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  total: { fontSize: 40, fontWeight: '800', marginTop: spacing.sm },
  statsRow: { width: '100%', flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 52, backgroundColor: colors.border },
  caption: { color: colors.text, fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' },
  detail: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  rows: { marginTop: spacing.md, paddingVertical: 0, borderWidth: 1 },
  personRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  person: { color: colors.text, fontSize: fontSize.md },
  count: { fontSize: fontSize.md, fontWeight: '700' },
  error: { color: colors.error, marginTop: spacing.sm },
});
