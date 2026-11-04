import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button, Card } from '@/src/components/ui';
import { getMoodOption } from '@/src/constants/moods';
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
}

function PersonMood({ name, entry, mine }: { name: string; entry: MoodEntry | null; mine?: boolean }) {
  const option = entry ? getMoodOption(entry.mood) : null;

  return (
    <View style={styles.person} accessible accessibilityLabel={`${name}: ${option?.label ?? (mine ? 'Henüz seçmediniz' : 'Henüz paylaşmadı')}`}>
      <View style={[styles.emojiCircle, option && { backgroundColor: `${option.color}18` }]}>
        {option ? <Text style={styles.emoji}>{option.emoji}</Text> : <Feather name="sun" size={23} color={colors.textSecondary} />}
      </View>
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
      <Text style={[styles.status, !!option && styles.selectedStatus]}>{option?.label ?? (mine ? 'Henüz seçmediniz' : 'Henüz paylaşmadı')}</Text>
    </View>
  );
}

/** Ana ekrandaki ruh hali özeti; veriyi ekran sağlar. */
export function MoodSummaryCard({ today, partnerToday, partnerName, paired, loading, error, onPress }: MoodSummaryCardProps) {
  const categoryColor = getCategoryColor('ruh-halim');
  return (
    <Card style={styles.card}>
      <View style={styles.heading}>
        <View style={[styles.headingIcon, { backgroundColor: categoryColor.tint }]}><Feather name="heart" size={19} color={categoryColor.color} /></View>
        <View style={styles.flex}>
          <Text style={styles.title} accessibilityRole="header">Ruh Halim</Text>
          <Text style={styles.subtitle}>Bugün birbirinize bir alan açın.</Text>
        </View>
      </View>

      {loading && !today && !partnerToday ? (
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Ruh halleri yükleniyor…</Text>
        </View>
      ) : paired ? (
        <View style={styles.people}>
          <PersonMood name="Siz" entry={today} mine />
          <View style={styles.divider} />
          <PersonMood name={partnerName || 'Partneriniz'} entry={partnerToday} />
        </View>
      ) : (
        <Text style={styles.unpaired}>Partnerinizle eşleşin; günlük ruh halinizi ve kısa notunuzu birbirinizle paylaşın.</Text>
      )}

      {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : null}
      <Button
        title={paired ? (today ? 'Bugünü Gör' : 'Ruh Halini Paylaş') : 'Ruh Halim’i Keşfet'}
        icon={paired ? 'smile' : 'heart'}
        variant="secondary"
        onPress={onPress}
        style={styles.action}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headingIcon: { width: 38, height: 38, borderRadius: radius.card, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19, marginTop: 2 },
  people: { flexDirection: 'row', alignItems: 'stretch', marginTop: spacing.lg },
  person: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  emojiCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.beige, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  emoji: { fontSize: 29 },
  name: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, textAlign: 'center' },
  status: { fontSize: fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 19, marginTop: spacing.xs },
  selectedStatus: { color: colors.text },
  divider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.sm },
  unpaired: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20, marginTop: spacing.lg },
  loading: { minHeight: 110, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  muted: { fontSize: fontSize.sm, color: colors.textSecondary },
  error: { fontSize: fontSize.sm, color: colors.error, lineHeight: 19, marginTop: spacing.md },
  action: { marginTop: spacing.lg },
});
