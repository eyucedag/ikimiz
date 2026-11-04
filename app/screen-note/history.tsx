import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { EmptyState, IconButton, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { getCategoryColor } from '@/src/constants/categories';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { formatDateTime } from '@/src/utils/date';

type Filter = 'all' | 'received' | 'sent';

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'received', label: 'Gelen' },
  { key: 'sent', label: 'Giden' },
];

export default function NoteHistoryScreen() {
  const categoryColor = getCategoryColor('ekrana-not');
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const { notes, refresh } = useScreenNotes(couple);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const visible = notes.filter((n) => (filter === 'all' ? true : filter === 'sent' ? n.senderId === user?.id : n.senderId !== user?.id));

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <Screen
      title="Not Geçmişi"
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerRight={couple.isPaired ? <IconButton icon="plus" accessibilityLabel="Yeni not" onPress={() => router.push('/screen-note/compose')} /> : undefined}
    >
      <View style={styles.filters}>
        {filters.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.pill, filter === f.key && { backgroundColor: categoryColor.color, borderColor: categoryColor.color }]}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.key }}
          >
            <Text style={[styles.pillText, filter === f.key && styles.pillTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>

      {visible.length === 0 ? (
        <EmptyState
          icon="edit-3"
          title="Burada henüz not yok"
          description={couple.isPaired ? 'Gönderdiğiniz ve aldığınız ekran notları burada saklanır.' : 'Not alışverişi için önce partnerinizle eşleşin.'}
          actionLabel={couple.isPaired ? 'Yeni Not Bırak' : 'Partner Davet Et'}
          onAction={() => router.push(couple.isPaired ? '/screen-note/compose' : '/couple/invite')}
        />
      ) : (
        visible.map((n) => {
          const mine = n.senderId === user?.id;
          return (
            <View key={n.id} style={[styles.note, { backgroundColor: n.backgroundColor, borderColor: categoryColor.color }, mine ? styles.mine : styles.theirs]}>
              <Text style={styles.noteText}>
                {n.emoji ? `${n.emoji} ` : ''}{n.text}
              </Text>
              {n.imageUrl ? <Image source={{ uri: n.imageUrl }} style={styles.sticker} resizeMode="contain" /> : null}
              <Text style={styles.meta}>
                {mine ? 'Siz' : couple.partner?.displayName ?? 'Partneriniz'} · {formatDateTime(n.createdAt)}
              </Text>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.beige },
  pillText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  pillTextActive: { color: colors.white },
  note: { borderRadius: radius.card, borderWidth: 1.5, padding: spacing.lg, marginBottom: spacing.md, maxWidth: '88%' },
  mine: { alignSelf: 'flex-end' },
  theirs: { alignSelf: 'flex-start' },
  noteText: { fontSize: fontSize.md, color: colors.text, lineHeight: 22 },
  sticker: { width: 140, height: 140, alignSelf: 'center', marginTop: spacing.sm },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm },
});
