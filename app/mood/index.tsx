import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, Card, EmptyState, IconButton, Screen, SectionHeader } from '@/src/components/ui';
import { getMoodOption, MOOD_NOTE_MAX_LENGTH, moodOptions } from '@/src/constants/moods';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, layout, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { useMoods } from '@/src/hooks/useMoods';
import { MoodDraft, MoodEntry, MoodValue } from '@/src/types/mood';
import { formatDate, relativeTime, todayLabel } from '@/src/utils/date';
import { getLocalMoodDate } from '@/src/utils/mood';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';

function SharedNotice() {
  const categoryColor = getCategoryColor('ruh-halim');
  return (
    <View style={[styles.sharedNotice, { backgroundColor: categoryColor.tint }]}>
      <Feather name="users" size={17} color={categoryColor.color} />
      <Text style={styles.sharedText}>Ruh haliniz ve notunuz mevcut partnerinizle paylaşılır.</Text>
    </View>
  );
}

function HistoryEntry({ entry, name }: { entry: MoodEntry; name: string }) {
  const option = getMoodOption(entry.mood);
  return (
    <View style={styles.historyEntry}>
      <View style={[styles.historyEmojiCircle, { backgroundColor: `${option.color}18` }]}>
        <Text style={styles.historyEmoji} accessible={false}>{option.emoji}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.historyName}>{name}</Text>
        <Text style={styles.historyMood}>{option.label}</Text>
        {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
      </View>
    </View>
  );
}

function historyDayLabel(date: string, currentDate: string) {
  if (date === currentDate) return 'Bugün';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (date === getLocalMoodDate(yesterday)) return 'Dün';
  // Tarih anahtarını yerel öğlen olarak okumak saat dilimi kaynaklı gün kaymasını önler.
  return formatDate(`${date}T12:00:00`);
}

export default function MoodScreen() {
  const categoryColor = getCategoryColor('ruh-halim');
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const moods = useMoods(couple);
  const appearance = useAppAppearance();
  const { width } = useWindowDimensions();
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [note, setNote] = useState('');
  const [draftScope, setDraftScope] = useState('');
  const [dirty, setDirty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const baselineRef = useRef<MoodDraft | null>(null);
  const draftScopeRef = useRef('');

  const currentDate = getLocalMoodDate();
  const coupleId = couple.couple?.id ?? null;
  const partnerId = couple.partner?.id;
  const partnerName = couple.partner?.displayName || 'Partneriniz';
  const scope = `${user?.id ?? ''}:${coupleId ?? ''}:${currentDate}`;
  const latestScopeRef = useRef(scope);
  latestScopeRef.current = scope;
  const today = moods.today?.ownerId === user?.id && moods.today?.coupleId === coupleId && moods.today?.date === currentDate ? moods.today : null;
  const partnerToday = moods.partnerToday?.ownerId === partnerId && moods.partnerToday?.coupleId === coupleId && moods.partnerToday?.date === currentDate ? moods.partnerToday : null;
  const optionColumns = Math.min(width, layout.maxContentWidth) >= 520 ? 5 : 2;
  const draftIsCurrent = draftScope === scope;

  useEffect(() => {
    const changedScope = draftScopeRef.current !== scope;
    if (changedScope) {
      draftScopeRef.current = scope;
      setDraftScope(scope);
      dirtyRef.current = false;
      setDirty(false);
      setSuccess(null);
      setSaveError(null);
    }
    // Arka plandaki yenilemeler, yazılmakta olan notu veya seçimi değiştirmez.
    if (changedScope || (!dirtyRef.current && !moods.saving)) {
      baselineRef.current = today ? { mood: today.mood, note: today.note } : null;
      setSelectedMood(today?.mood ?? null);
      setNote(today?.note ?? '');
    }
  }, [scope, today?.id, today?.mood, today?.note, today?.updatedAt, moods.saving, dirty]);

  const historyByDay = useMemo(() => {
    if (!coupleId || !user?.id) return [];
    const start = new Date();
    start.setDate(start.getDate() - 29);
    const firstDate = getLocalMoodDate(start);
    const groups = new Map<string, MoodEntry[]>();
    for (const entry of moods.history) {
      if (entry.coupleId !== coupleId || (entry.ownerId !== user.id && entry.ownerId !== partnerId) || entry.date < firstDate || entry.date > currentDate) continue;
      const day = groups.get(entry.date) ?? [];
      day.push(entry);
      groups.set(entry.date, day);
    }
    return [...groups.entries()]
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, entries]) => ({
        date,
        entries: entries.sort((a, b) => Number(b.ownerId === user.id) - Number(a.ownerId === user.id)),
      }));
  }, [moods.history, coupleId, user?.id, partnerId, currentDate]);

  const markEdited = (mood: MoodValue | null, nextNote: string) => {
    const baseline = baselineRef.current;
    const changed = mood !== (baseline?.mood ?? null) || nextNote !== (baseline?.note ?? '');
    dirtyRef.current = changed;
    setDirty(changed);
    setSuccess(null);
    setSaveError(null);
  };

  const onRefresh = async () => {
    if (refreshing || moods.saving) return;
    setRefreshing(true);
    try {
      await Promise.all([couple.refresh(), moods.refresh()]);
    } finally {
      setRefreshing(false);
    }
  };

  const submit = async () => {
    if (!selectedMood || !coupleId || !user || moods.saving || draftScopeRef.current !== scope) return;
    // Gece yarısından sonra önceki günün taslağını yeni güne kaydetmeyin.
    if (getLocalMoodDate() !== currentDate) {
      dirtyRef.current = false;
      setDirty(false);
      setSelectedMood(null);
      setNote('');
      setSuccess(null);
      setSaveError(null);
      void onRefresh();
      return;
    }
    const submittedScope = scope;
    const wasUpdate = !!today;
    setSaveError(null);
    setSuccess(null);
    try {
      const result = await moods.save({ mood: selectedMood, note });
      if (latestScopeRef.current !== submittedScope) return;
      if (result.error || !result.data) {
        setSaveError(result.error ?? 'Ruh haliniz kaydedilemedi. Lütfen tekrar deneyin.');
        return;
      }
      baselineRef.current = { mood: result.data.mood, note: result.data.note };
      dirtyRef.current = false;
      setSelectedMood(result.data.mood);
      setNote(result.data.note);
      setDirty(false);
      setSuccess(wasUpdate ? 'Bugünkü ruh haliniz güncellendi. Partneriniz değişikliği görebilir.' : 'Bugünkü ruh haliniz paylaşıldı. Partneriniz görebilir.');
    } catch {
      if (latestScopeRef.current === submittedScope) setSaveError('Ruh haliniz kaydedilemedi. Lütfen tekrar deneyin.');
    }
  };

  if (couple.loading) {
    return (
      <Screen title="Ruh Halim">
        <View style={styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.muted}>Eşleşmeniz kontrol ediliyor…</Text>
        </View>
      </Screen>
    );
  }

  if (!couple.isPaired) {
    return (
      <Screen title="Ruh Halim" refreshing={refreshing} onRefresh={onRefresh}>
        <SharedNotice />
        <EmptyState
          icon="heart"
          title="Birbirinizin gününe yakın olun"
          description="Partnerinizle eşleştiğinizde günlük ruh halinizi ve kısa notunuzu paylaşabilir, son 30 günü birlikte görebilirsiniz."
          actionLabel="Partner Davet Et"
          onAction={() => router.push('/couple/invite')}
        />
        <Button title="Ruh Halini Paylaş" icon="smile" toneColor={categoryColor.color} onPress={submit} disabled />
        <Text style={styles.saveHint}>Ruh halinizi paylaşmak için önce partnerinizle eşleşin.</Text>
      </Screen>
    );
  }

  const initiallyLoading = moods.loading && !today && historyByDay.length === 0;
  const partnerOption = partnerToday ? getMoodOption(partnerToday.mood) : null;

  return (
    <Screen
      title="Ruh Halim"
      refreshing={refreshing}
      onRefresh={onRefresh}
      headerRight={<IconButton icon="refresh-cw" accessibilityLabel="Ruh hallerini yenile" onPress={onRefresh} />}
    >
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>GÜNÜNÜZDEN KÜÇÜK BİR PAYLAŞIM</Text>
        <Text style={styles.headline} accessibilityRole="header">Bugün nasıl hissediyorsunuz?</Text>
        <Text style={styles.description}>Bir duygu seçin, isterseniz kısa bir not ekleyin.</Text>
      </View>
      <SharedNotice />

      {moods.error && moods.error !== saveError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText} accessibilityRole="alert">{moods.error}</Text>
          <Button title="Tekrar Dene" variant="secondary" icon="refresh-cw" toneColor={categoryColor.color} onPress={onRefresh} compact style={styles.retry} disabled={refreshing || moods.saving} />
        </View>
      ) : null}

      {initiallyLoading ? (
        <Card style={[styles.section, { borderColor: categoryColor.color, borderWidth: 1.5 }]}>
          <View style={styles.loading} accessibilityLiveRegion="polite">
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.muted}>Ruh halleri yükleniyor…</Text>
          </View>
        </Card>
      ) : (
        <>
          <Card style={[styles.section, { borderColor: categoryColor.color, borderWidth: 1.5 }]}>
            <Text style={styles.cardTitle} accessibilityRole="header">Bugünkü ruh haliniz</Text>
            <Text style={styles.date}>{todayLabel()}</Text>
            <Text style={styles.cardDescription}>Gün içinde değiştirebilirsiniz. Her gün tek bir kaydınız olur.</Text>

            <View style={styles.moodGrid}>
              {moodOptions.map((option) => {
                const selected = draftIsCurrent && selectedMood === option.value;
                return (
                  <View key={option.value} style={[styles.moodCell, { width: `${100 / optionColumns}%` }]}>
                    <Pressable
                      onPress={() => { setSelectedMood(option.value); markEdited(option.value, note); }}
                      disabled={moods.saving || !draftIsCurrent}
                      accessibilityRole="button"
                      accessibilityLabel={option.label}
                      accessibilityState={{ selected, disabled: moods.saving || !draftIsCurrent }}
                      style={({ pressed }) => [styles.moodOption, { backgroundColor: appearance.surfaceColor }, selected && { borderColor: categoryColor.color, backgroundColor: categoryColor.tint }, pressed && styles.pressed, moods.saving && styles.disabled]}
                    >
                      <View style={styles.selectionMark}>{selected ? <Feather name="check-circle" size={15} color={categoryColor.color} /> : null}</View>
                      <Text style={styles.moodEmoji} accessible={false}>{option.emoji}</Text>
                      <Text style={[styles.moodLabel, selected && styles.moodLabelSelected]}>{option.label}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            <View style={styles.noteHeading}>
              <Text style={styles.noteLabel}>Kısa bir not</Text>
              <Text style={styles.optional}>İsteğe bağlı</Text>
            </View>
            <TextInput
              value={draftIsCurrent ? note : ''}
              onChangeText={(text) => { setNote(text); markEdited(selectedMood, text); }}
              editable={!moods.saving && draftIsCurrent}
              maxLength={MOOD_NOTE_MAX_LENGTH}
              multiline
              placeholder="…"
              placeholderTextColor={colors.textTertiary}
              textAlignVertical="top"
              accessibilityLabel="Bugünkü ruh haliniz için kısa not"
              accessibilityHint={`İsteğe bağlı, en fazla ${MOOD_NOTE_MAX_LENGTH} karakter. Notunuz mevcut partnerinizle paylaşılır.`}
              style={[styles.noteInput, { backgroundColor: appearance.surfaceColor }, moods.saving && styles.disabled]}
            />
            <Text style={styles.counter}>{draftIsCurrent ? note.length : 0}/{MOOD_NOTE_MAX_LENGTH}</Text>

            {draftIsCurrent && saveError ? <Text style={styles.saveError} accessibilityRole="alert">{saveError}</Text> : null}
            {draftIsCurrent && success ? (
              <View style={[styles.successBox, { backgroundColor: categoryColor.tint }]} accessibilityLiveRegion="polite">
                <Feather name="check-circle" size={18} color={categoryColor.color} />
                <Text style={styles.successText}>{success}</Text>
              </View>
            ) : null}
            <Button
              title={today ? 'Bugünü Güncelle' : 'Ruh Halini Paylaş'}
              icon={today ? 'check' : 'heart'}
              toneColor={categoryColor.color}
              onPress={submit}
              loading={moods.saving}
              disabled={!draftIsCurrent || !selectedMood || (!!today && !dirty)}
            />
            <Text style={styles.saveHint}>{today ? 'Yalnızca kendi bugünkü kaydınızı düzenleyebilirsiniz.' : 'Paylaştığınızda partneriniz ruh halinizi ve notunuzu görebilir.'}</Text>
          </Card>

          <Card style={[styles.section, { borderColor: categoryColor.color, borderWidth: 1.5 }]}>
            <Text style={styles.cardTitle} accessibilityRole="header">{partnerName} bugün</Text>
            {partnerToday && partnerOption ? (
              <>
                <View style={styles.partnerMood}>
                  <View style={[styles.partnerEmojiCircle, { backgroundColor: `${partnerOption.color}18` }]}>
                    <Text style={styles.partnerEmoji} accessible={false}>{partnerOption.emoji}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.partnerLabel}>{partnerOption.label}</Text>
                    <Text style={styles.muted}>Paylaşım · {relativeTime(partnerToday.updatedAt)}</Text>
                  </View>
                </View>
                {partnerToday.note ? <Text style={[styles.partnerNote, { backgroundColor: appearance.surfaceColor }]}>{partnerToday.note}</Text> : <Text style={styles.muted}>Bugün bir not eklemedi.</Text>}
              </>
            ) : (
              <View style={styles.partnerEmpty}>
                <View style={[styles.waitingIcon, { backgroundColor: categoryColor.tint }]}><Feather name="sun" size={24} color={categoryColor.color} /></View>
                <View style={styles.flex}>
                  <Text style={styles.waitingTitle}>Henüz paylaşmadı</Text>
                  <Text style={styles.muted}>Paylaştığında ruh hali ve notu burada görünecek.</Text>
                </View>
              </View>
            )}
          </Card>

          <SectionHeader title="Son 30 Gün" />
          <Text style={styles.historyDescription}>Mevcut eşleşmenizde ikinizin paylaştığı ruh halleri.</Text>
          {historyByDay.length === 0 ? (
            <Card style={{ borderColor: categoryColor.color, borderWidth: 1.5 }}>
              <EmptyState compact icon="calendar" title="İlk paylaşımınızla başlasın" description="Günlük ruh halleriniz ve notlarınız burada birikir." />
            </Card>
          ) : historyByDay.map(({ date, entries }) => (
            <View key={date} style={styles.historyDay}>
              <Text style={styles.historyDate} accessibilityRole="header">{historyDayLabel(date, currentDate)}</Text>
              <Card style={[styles.historyCard, { borderColor: categoryColor.color, borderWidth: 1.5 }]}>
                {entries.map((entry, index) => (
                  <View key={entry.id} style={index > 0 ? styles.historyDivider : undefined}>
                    <HistoryEntry entry={entry} name={entry.ownerId === user?.id ? 'Siz' : partnerName} />
                  </View>
                ))}
              </Card>
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { marginBottom: spacing.sm, marginTop: spacing.xs },
  eyebrow: { fontSize: 10, color: colors.textSecondary, fontWeight: '600', letterSpacing: 1, marginBottom: spacing.xs },
  headline: { fontSize: fontSize.xl, color: colors.text, fontWeight: '700', lineHeight: 27 },
  description: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19, marginTop: spacing.xs },
  sharedNotice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.card, backgroundColor: colors.accentLight, marginBottom: spacing.sm },
  sharedText: { flex: 1, fontSize: fontSize.xs, color: colors.text, lineHeight: 17 },
  section: { marginBottom: spacing.md, padding: spacing.md },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  date: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  cardDescription: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17, marginTop: spacing.xs },
  moodGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs, marginTop: spacing.sm, marginBottom: spacing.sm },
  moodCell: { padding: 3 },
  moodOption: { minHeight: 78, borderRadius: radius.card, borderWidth: 1.5, borderColor: colors.border, padding: spacing.xs, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  selectionMark: { height: 14, alignSelf: 'flex-end' },
  moodEmoji: { fontSize: 23, marginBottom: 2 },
  moodLabel: { fontSize: fontSize.xs, color: colors.text, textAlign: 'center', fontWeight: '500', lineHeight: 16 },
  moodLabelSelected: { fontWeight: '700' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.6 },
  noteHeading: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.xs },
  noteLabel: { fontSize: fontSize.sm, color: colors.text, fontWeight: '600' },
  optional: { fontSize: fontSize.xs, color: colors.textSecondary },
  noteInput: { minHeight: 68, borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, padding: spacing.sm, color: colors.text, backgroundColor: colors.background, fontSize: fontSize.sm, lineHeight: 20 },
  counter: { textAlign: 'right', fontSize: 10, color: colors.textSecondary, marginTop: 2, marginBottom: spacing.sm },
  saveHint: { fontSize: 10, color: colors.textSecondary, textAlign: 'center', lineHeight: 15, marginTop: spacing.xs },
  successBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.control, backgroundColor: colors.accentLight, marginBottom: spacing.md },
  successText: { flex: 1, color: colors.text, fontSize: fontSize.sm, lineHeight: 19 },
  errorBox: { padding: spacing.md, borderWidth: 1, borderColor: colors.error, borderRadius: radius.card, backgroundColor: colors.card, marginBottom: spacing.lg },
  errorText: { color: colors.error, fontSize: fontSize.sm, lineHeight: 20 },
  retry: { alignSelf: 'flex-start', marginTop: spacing.md },
  saveError: { color: colors.error, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  muted: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 20 },
  partnerMood: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  partnerEmojiCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  partnerEmoji: { fontSize: 25 },
  partnerLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: 2 },
  partnerNote: { fontSize: fontSize.sm, color: colors.text, lineHeight: 20, padding: spacing.sm, borderRadius: radius.control, backgroundColor: colors.background },
  partnerEmpty: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  waitingIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentLight },
  waitingTitle: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500', marginBottom: 2 },
  historyDescription: { fontSize: fontSize.xs, color: colors.textSecondary, lineHeight: 17, marginTop: -spacing.xs, marginBottom: spacing.sm },
  historyDay: { marginBottom: spacing.sm },
  historyDate: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.sm },
  historyCard: { paddingVertical: 0 },
  historyEntry: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.lg },
  historyEmojiCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  historyEmoji: { fontSize: 24 },
  historyName: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: 2 },
  historyMood: { fontSize: fontSize.md, color: colors.text, fontWeight: '600' },
  historyNote: { fontSize: fontSize.sm, color: colors.text, lineHeight: 21, marginTop: spacing.sm },
  historyDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
