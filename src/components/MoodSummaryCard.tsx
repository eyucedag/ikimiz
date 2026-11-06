import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from '@/src/components/ui';
import { getMoodOption } from '@/src/constants/moods';
import { auroraMoodIcons } from '@/src/constants/auroraAssets';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { MoodEntry } from '@/src/types/mood';

interface MoodSummaryCardProps {
  today: MoodEntry | null;
  partnerToday: MoodEntry | null;
  partnerName: string;
  paired: boolean;
  loading: boolean;
  error: string | null;
  onPress: () => void;
  compact?: boolean;
}

function PersonMood({ name, entry, mine, toneColor, compact }: { name: string; entry: MoodEntry | null; mine?: boolean; toneColor: string; compact?: boolean }) {
  const option = entry ? getMoodOption(entry.mood) : null;

  return (
    <View style={[styles.person, compact && styles.compactPerson]} accessible accessibilityLabel={`${name}: ${option?.label ?? (mine ? 'Henüz seçmediniz' : 'Henüz paylaşmadı')}`}>
      <View style={[styles.emojiCircle, compact && styles.compactMoodCircle, option && { backgroundColor: `${option.color}18` }]}>
        {entry ? <Image source={auroraMoodIcons[entry.mood]} style={[styles.moodIcon, compact && styles.compactMoodIcon]} resizeMode="contain" /> : <Feather name="sun" size={compact ? 16 : 18} color={toneColor} />}
      </View>
      <View style={styles.personCopy}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={[styles.status, !!option && styles.selectedStatus]} numberOfLines={1}>{option?.label ?? (mine ? 'Henüz seçmediniz' : 'Henüz paylaşmadı')}</Text>
      </View>
    </View>
  );
}

/** Ana ekrandaki ruh hali özeti; veriyi ekran sağlar. */
export function MoodSummaryCard({ today, partnerToday, partnerName, paired, loading, error, onPress, compact = false }: MoodSummaryCardProps) {
  const categoryColor = getCategoryColor('ruh-halim');
  return (
    <Card style={[styles.card, compact && styles.compactCard, { borderColor: categoryColor.color, borderWidth: 1 }]}>
      <View style={[styles.heading, compact && styles.compactHeading]}>
        <View style={[styles.headingIcon, compact && styles.compactHeadingIcon, { backgroundColor: categoryColor.tint }]}><Feather name="heart" size={compact ? 15 : 19} color={categoryColor.color} /></View>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">Ruh Halim</Text>
        </View>
      </View>

      {loading && !today && !partnerToday ? (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={categoryColor.color} />
          <Text style={styles.muted}>Ruh halleri yükleniyor…</Text>
        </View>
      ) : paired ? (
        <View style={[styles.people, compact && styles.compactPeople]}>
          <PersonMood name="Siz" entry={today} mine toneColor={categoryColor.color} compact={compact} />
          <View style={[styles.divider, compact && styles.compactDivider]} />
          <PersonMood name={partnerName || 'Partneriniz'} entry={partnerToday} toneColor={categoryColor.color} compact={compact} />
        </View>
      ) : (
          <Text style={styles.unpaired} numberOfLines={2}>Partnerinizle eşleşin; günlük ruh halinizi paylaşın.</Text>
      )}

      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Button
        title={paired ? (today ? 'Ruhumu Gör' : 'Ruh Halini Paylaş') : 'Ruh Halim’i Keşfet'}
        icon={paired ? 'smile' : 'heart'}
        toneColor={categoryColor.color}
        onPress={onPress}
        compact
        style={[styles.action, compact && styles.compactAction]}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, paddingVertical: spacing.xs },
  compactCard: { padding: spacing.xs, marginBottom: 0 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  compactHeading: { gap: spacing.xs },
  headingIcon: { width: 27, height: 27, borderRadius: radius.control, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  compactHeadingIcon: { width: 23, height: 23, borderRadius: 12 },
  flex: { flex: 1 },
  title: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  people: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  compactPeople: { marginTop: 2 },
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.xs },
  compactPerson: { gap: 3, paddingHorizontal: 2 },
  personCopy: { flex: 1, minWidth: 0 },
  emojiCircle: { width: 34, height: 34, flexShrink: 0, borderRadius: 17, backgroundColor: colors.beige, alignItems: 'center', justifyContent: 'center' },
  moodIcon: { width: 30, height: 30 },
  compactMoodCircle: { width: 27, height: 27, borderRadius: 14 },
  compactMoodIcon: { width: 24, height: 24 },
  name: { fontSize: fontSize.xs, fontWeight: '600', color: colors.text },
  status: { fontSize: 10, color: colors.textSecondary, lineHeight: 13, marginTop: 1 },
  selectedStatus: { color: colors.text },
  divider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  compactDivider: { height: 24, marginHorizontal: 2 },
  unpaired: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 16, marginTop: spacing.sm },
  loading: { minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  muted: { fontSize: fontSize.sm, color: colors.textSecondary },
  error: { fontSize: fontSize.sm, color: colors.error, lineHeight: 19, marginTop: spacing.md },
  action: { marginTop: spacing.xs, minHeight: 36, paddingVertical: 3 },
  compactAction: { height: 32, minHeight: 32, marginTop: 3, paddingVertical: 0, paddingHorizontal: spacing.sm, borderRadius: 12 },
});
