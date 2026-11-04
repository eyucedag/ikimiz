import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, EmptyState, Screen, SectionHeader } from '@/src/components/ui';
import { MoodSummaryCard } from '@/src/components/MoodSummaryCard';
import { KissCategoryButton } from '@/src/components/KissCategoryButton';
import { categories, getCategoryColor, getCategoryRoute, isCategoryReady } from '@/src/constants/categories';
import { colors, fontSize, layout, radius, spacing } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks/useAppState';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { useMoods } from '@/src/hooks/useMoods';
import { greeting, relativeTime, todayLabel } from '@/src/utils/date';

export default function TodayScreen() {
  const noteColor = getCategoryColor('ekrana-not');
  const calendarColor = getCategoryColor('takvim');
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const { latestFromPartner, refresh: refreshNotes } = useScreenNotes(couple);
  const moods = useMoods(couple);
  const { upcoming, refreshNotifications } = useAppState();
  const { width } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);

  const columns = Math.min(width, layout.maxContentWidth) >= 520 ? 4 : 2;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([couple.refresh(), refreshNotes(), moods.refresh(), refreshNotifications()]);
    } finally {
      setRefreshing(false);
    }
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
      <Card style={[styles.section, { borderColor: noteColor.color, borderWidth: 1.5 }]}>
        {couple.isPaired ? (
          <>
            <SectionHeader title="Partnerinden Not" actionLabel="Tüm Notlar" actionColor={noteColor.color} onAction={() => router.push('/screen-note/history')} />
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
            <Button title="Yeni Not Bırak" icon="edit-3" toneColor={noteColor.color} onPress={() => router.push('/screen-note/compose')} style={styles.cardButton} />
          </>
        ) : (
          <>
            <SectionHeader title="Partnerinden Not" />
            <View style={styles.connectRow}>
              <View style={[styles.connectIcon, { backgroundColor: noteColor.tint }]}>
                <Feather name="link" size={20} color={noteColor.color} />
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

      <MoodSummaryCard
        today={moods.today}
        partnerToday={moods.partnerToday}
        partnerName={couple.partner?.displayName ?? 'Partneriniz'}
        paired={couple.isPaired}
        loading={moods.loading || couple.loading}
        error={moods.error}
        onPress={() => router.push('/mood')}
      />

      {/* Yaklaşanlar */}
      <Card style={[styles.section, { borderColor: calendarColor.color, borderWidth: 1.5 }]}>
        <SectionHeader title="Yaklaşanlar" />
        {upcoming.length === 0 ? (
          <EmptyState
            compact
            icon="sun"
            title="Önünüz açık"
            description="Etkinlikler, görevler ve hatırlatmalar eklendiğinde en yakın olanlar burada sıralanacak."
            actionLabel="Takvimi Keşfet"
            onAction={() => router.push('/categories/takvim')}
            toneColor={calendarColor.color}
            toneTint={calendarColor.tint}
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
        {categories.filter((c) => c.slug !== 'opucuk').map((c) => (
          <Pressable
            key={c.slug}
            onPress={() => router.push(getCategoryRoute(c.slug))}
            accessibilityRole="button"
            accessibilityLabel={c.title}
            style={({ pressed }) => [styles.tile, { width: `${100 / columns}%` }, pressed && styles.pressed]}
          >
            <View style={[styles.tileInner, { borderColor: c.color, borderTopColor: c.color }]}>
              <View style={[styles.tileIcon, { backgroundColor: c.tint }]}>
                <Feather name={c.icon as keyof typeof Feather.glyphMap} size={20} color={c.color} />
              </View>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {c.title}
              </Text>
              {isCategoryReady(c.slug)
                ? <Badge label="Hazır" color={c.color} backgroundColor={c.tint} />
                : <Badge label="Yakında" tone="neutral" />}
            </View>
          </Pressable>
        ))}
      </View>
      <KissCategoryButton ownerId={user?.id} partnerId={couple.partner?.id} coupleId={couple.couple?.id} />
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
    borderWidth: 1.5,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.accent,
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
