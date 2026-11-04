import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, EmptyState, Screen, SectionHeader } from '@/src/components/ui';
import { categories } from '@/src/constants/categories';
import { colors, fontSize, layout, radius, spacing } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks/useAppState';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { Category } from '@/src/types';
import { greeting, relativeTime, todayLabel } from '@/src/utils/date';

/** Ekrana Not Aşama 1'de çalışır; diğer kategoriler "Yakında" ekranına gider. */
const categoryRoute = (c: Category) => (c.slug === 'ekrana-not' ? '/screen-note/compose' : `/categories/${c.slug}`);

export default function TodayScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const { latestFromPartner, refresh: refreshNotes } = useScreenNotes(couple);
  const { upcoming, refreshNotifications } = useAppState();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const columns = Math.min(width, layout.maxContentWidth) >= 520 ? 4 : 2;

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([couple.refresh(), refreshNotes(), refreshNotifications()]);
    setRefreshing(false);
  };

  return (
    <Screen inTabs refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <Text style={styles.appTitle} accessibilityRole="header">
          İkimiz
        </Text>
        <Text style={styles.subtitle}>
          {greeting()}, {user?.displayName} · {todayLabel()}
        </Text>
      </View>

      {/* Partnerinden Not */}
      <Card style={styles.section}>
        {couple.isPaired ? (
          <>
            <SectionHeader title="Partnerinden Not" actionLabel="Tüm Notlar" onAction={() => router.push('/screen-note/history')} />
            {latestFromPartner ? (
              <View style={[styles.note, { backgroundColor: latestFromPartner.backgroundColor }]}>
                <Text style={styles.noteEmoji}>{latestFromPartner.emoji}</Text>
                <Text style={styles.noteText}>{latestFromPartner.text}</Text>
                <Text style={styles.noteMeta}>
                  {couple.partner?.displayName} · {relativeTime(latestFromPartner.createdAt)}
                </Text>
              </View>
            ) : (
              <Text style={styles.muted}>{couple.partner?.displayName} henüz bir not bırakmadı. İlk notu siz bırakın.</Text>
            )}
            <Button title="Yeni Not Bırak" icon="edit-3" onPress={() => router.push('/screen-note/compose')} style={styles.cardButton} />
          </>
        ) : (
          <>
            <SectionHeader title="Partnerinden Not" />
            <View style={styles.connectRow}>
              <View style={styles.connectIcon}>
                <Feather name="link" size={20} color={colors.accent} />
              </View>
              <Text style={styles.connectText}>
                {couple.pendingInvitation
                  ? `Davet kodunuz ${couple.pendingInvitation.code} partnerinizin onayını bekliyor.`
                  : 'Partnerinizle bağlandığınızda bıraktığı notlar burada görünür.'}
              </Text>
            </View>
            {couple.pendingInvitation ? (
              <Button title="Davet Durumunu Gör" variant="secondary" onPress={() => router.push('/couple/invite')} style={styles.cardButton} />
            ) : (
              <View style={styles.buttonRow}>
                <Button title="Davet Et" icon="send" onPress={() => router.push('/couple/invite')} style={styles.flex} />
                <Button title="Kodum Var" variant="secondary" onPress={() => router.push('/couple/accept')} style={styles.flex} />
              </View>
            )}
          </>
        )}
      </Card>

      {/* Yaklaşanlar */}
      <Card style={styles.section}>
        <SectionHeader title="Yaklaşanlar" />
        {upcoming.length === 0 ? (
          <EmptyState
            compact
            icon="sun"
            title="Önünüz açık"
            description="Etkinlikler, görevler ve hatırlatmalar eklendiğinde en yakın olanlar burada sıralanacak."
            actionLabel="Takvimi Keşfet"
            onAction={() => router.push('/categories/takvim')}
          />
        ) : (
          upcoming.map((item) => (
            <View key={item.id} style={styles.upcomingRow}>
              <Text style={styles.upcomingTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.subtitle}</Text>
            </View>
          ))
        )}
      </Card>

      {/* Kategoriler */}
      <SectionHeader title="Kategoriler" />
      <View style={styles.grid}>
        {categories.map((c) => (
          <Pressable
            key={c.slug}
            onPress={() => router.push(categoryRoute(c))}
            accessibilityRole="button"
            accessibilityLabel={c.title}
            style={({ pressed }) => [styles.tile, { width: `${100 / columns}%` }, pressed && styles.pressed]}
          >
            <View style={styles.tileInner}>
              <View style={styles.tileIcon}>
                <Feather name={c.icon as keyof typeof Feather.glyphMap} size={20} color={colors.accent} />
              </View>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {c.title}
              </Text>
              {c.slug !== 'ekrana-not' ? <Badge label="Yakında" tone="neutral" /> : <Badge label="Hazır" />}
            </View>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.sm, marginBottom: spacing.xl },
  appTitle: { fontSize: fontSize.xxxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  section: { marginBottom: spacing.lg },
  note: { borderRadius: radius.card, padding: spacing.lg },
  noteEmoji: { fontSize: fontSize.xxl, marginBottom: spacing.xs },
  noteText: { fontSize: fontSize.lg, color: colors.text, lineHeight: 24 },
  noteMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm },
  muted: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  cardButton: { marginTop: spacing.lg },
  connectRow: { flexDirection: 'row', alignItems: 'center' },
  connectIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  connectText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  flex: { flex: 1 },
  upcomingRow: { paddingVertical: spacing.sm },
  upcomingTitle: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  tile: { padding: spacing.xs },
  tileInner: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginVertical: spacing.sm },
  pressed: { opacity: 0.8 },
});
