import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { calendarService, CoupleCalendarEvent } from '@/src/services/calendarService';
import { ImportantDate, importantDateService } from '@/src/services/importantDateService';
import { TravelPlace, travelService } from '@/src/services/travelService';
import { supabase } from '@/src/lib/supabase';

type Entry = { id: string; date: string; title: string; detail: string; kind: 'event' | 'special' | 'travel' | 'relationship'; color: string; ownerId?: string };
const startOfMonth = (value: Date) => new Date(value.getFullYear(), value.getMonth(), 1);
const dateKey = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
const dateName = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }); };
const monthName = (value: Date) => value.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

export default function CalendarScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const calendarColor = getCategoryColor('takvim');
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [title, setTitle] = useState('');
  const [events, setEvents] = useState<CoupleCalendarEvent[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [travelPlaces, setTravelPlaces] = useState<TravelPlace[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!couple.couple?.id) return;
    try {
      const [eventRows, dateRows, travelRows] = await Promise.all([
        calendarService.list(couple.couple.id), importantDateService.list(couple.couple.id), travelService.list(couple.couple.id),
      ]);
      setEvents(eventRows); setImportantDates(dateRows); setTravelPlaces(travelRows); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Takvim yüklenemedi.'); }
  }, [couple.couple?.id]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));
  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = supabase.channel(`calendar-${coupleId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'important_dates', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'travel_places', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` }, () => { void couple.refresh(); void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, couple.refresh, refresh]);

  const entries = useMemo<Entry[]>(() => {
    const year = month.getFullYear();
    const monthNumber = String(month.getMonth() + 1).padStart(2, '0');
    const result: Entry[] = [];
    const eventColor = calendarColor.color;
    for (const event of events) {
      const startsAt = new Date(event.startsAt);
      const key = dateKey(startsAt);
      if (startsAt.getFullYear() === year && startsAt.getMonth() === month.getMonth()) result.push({ id: `event-${event.id}`, date: key, title: event.title, detail: event.description ?? 'Takvim etkinliği', kind: 'event', color: eventColor, ownerId: event.ownerId });
    }
    for (const item of importantDates) {
      const originalMonthDay = item.date.slice(5);
      const key = item.kind === 'other' ? item.date : `${year}-${originalMonthDay}`;
      if (key.startsWith(`${year}-${monthNumber}-`)) result.push({ id: `special-${item.id}`, date: key, title: item.title, detail: item.kind === 'birthday' ? 'Doğum günü' : item.kind === 'anniversary' ? 'Yıl dönümü' : 'Özel gün', kind: 'special', color: getCategoryColor('ozel-gunler').color, ownerId: item.ownerId });
    }
    for (const place of travelPlaces) {
      if (place.visitedOn.startsWith(`${year}-${monthNumber}-`)) result.push({ id: `travel-${place.id}`, date: place.visitedOn, title: `${place.city}, ${place.country}`, detail: 'Gezilen yer', kind: 'travel', color: getCategoryColor('gezilen-yerler').color, ownerId: place.ownerId });
    }
    const relationshipStartedAt = couple.couple?.relationshipStartedAt;
    if (relationshipStartedAt) {
      const started = new Date(relationshipStartedAt);
      if (started.getMonth() + 1 === month.getMonth() + 1) {
        const key = `${year}-${String(started.getMonth() + 1).padStart(2, '0')}-${String(started.getDate()).padStart(2, '0')}`;
        result.push({ id: 'relationship-anniversary', date: key, title: 'İlişki yıl dönümünüz', detail: 'İlişki başlangıcı', kind: 'relationship', color: getCategoryColor('ozel-gunler').color });
      }
    }
    return result.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
  }, [month, events, importantDates, travelPlaces, couple.couple?.relationshipStartedAt, calendarColor.color]);

  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = (new Date(month.getFullYear(), month.getMonth(), 1).getDay() + 6) % 7;
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate);
  const moveMonth = (offset: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1);
    setMonth(next);
    setSelectedDate(dateKey(next));
  };

  const addEvent = async () => {
    if (!user || !couple.couple || !couple.partner || !title.trim()) return;
    setSaving(true); setError('');
    try {
      const [year, monthValue, day] = selectedDate.split('-').map(Number);
      const startsAt = new Date(year, monthValue - 1, day, 12).toISOString();
      const event = await calendarService.add({ ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id, title, startsAt });
      setEvents((previous) => [...previous, event]); setTitle('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Etkinlik eklenemedi.'); }
    finally { setSaving(false); }
  };

  const removeEvent = (entry: Entry) => Alert.alert('Etkinliği kaldır', `${entry.title} kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await calendarService.remove(entry.id.replace('event-', '')); setEvents((previous) => previous.filter((event) => `event-${event.id}` !== entry.id)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Etkinlik kaldırılamadı.'); }
    } },
  ]);

  if (couple.loading) return <Screen title="Takvim"><CoupleLoading /></Screen>;

  return <Screen title="Takvim" onRefresh={refresh}>
    {!couple.isPaired ? <EmptyState icon="users" title="Önce eşleşin" description="Ortak takviminizi kullanmak için partnerinizle eşleşin." /> : <>
      <Card style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => moveMonth(-1)} hitSlop={8} accessibilityLabel="Önceki ay"><Feather name="chevron-left" size={21} color={calendarColor.color} /></Pressable>
          <Text style={styles.monthTitle}>{monthName(month)}</Text>
          <Pressable onPress={() => moveMonth(1)} hitSlop={8} accessibilityLabel="Sonraki ay"><Feather name="chevron-right" size={21} color={calendarColor.color} /></Pressable>
        </View>
        <View style={styles.grid}>
          {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => <Text key={day} style={styles.weekday}>{day}</Text>)}
          {Array.from({ length: leading }, (_, index) => <View key={`blank-${index}`} style={styles.dayCell} />)}
          {Array.from({ length: days }, (_, index) => {
            const day = index + 1;
            const key = dateKey(new Date(month.getFullYear(), month.getMonth(), day));
            const marks = entries.filter((entry) => entry.date === key);
            const selected = selectedDate === key;
            return <Pressable key={key} onPress={() => setSelectedDate(key)} style={styles.dayCell} accessibilityRole="button" accessibilityState={{ selected }}>
              <View style={[styles.dayBubble, selected && { backgroundColor: calendarColor.color }]}><Text style={[styles.dayText, selected && styles.selectedDayText]}>{day}</Text></View>
              <View style={styles.dots}>{marks.slice(0, 3).map((entry, markIndex) => <View key={`${entry.id}-${markIndex}`} style={[styles.dot, { backgroundColor: entry.color }]} />)}</View>
            </Pressable>;
          })}
        </View>
      </Card>

      <Text style={styles.sectionTitle}>{dateName(selectedDate)}</Text>
      {selectedEntries.length === 0 ? <Card style={styles.emptyCard}><EmptyState compact icon="calendar" title="Bu tarihte kayıt yok" description="Bu güne bir etkinlik ekleyebilirsiniz." /></Card> : selectedEntries.map((entry) => <Card key={entry.id} style={styles.entryCard}>
        <View style={[styles.entryMark, { backgroundColor: entry.color }]} />
        <View style={styles.entryCopy}><Text style={styles.entryTitle}>{entry.title}</Text><Text style={styles.entryDetail}>{entry.detail}</Text></View>
        {entry.kind === 'event' && entry.ownerId === user?.id ? <Pressable onPress={() => removeEvent(entry)} hitSlop={8} accessibilityLabel="Etkinliği kaldır"><Feather name="trash-2" size={16} color={colors.error} /></Pressable> : null}
      </Card>)}

      <Card style={styles.addCard}>
        <Text style={styles.addTitle}>Seçili güne etkinlik ekle</Text>
        <Input compact label="Etkinlik adı" placeholder="…" value={title} onChangeText={setTitle} returnKeyType="done" onSubmitEditing={() => { void addEvent(); }} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title="Takvime ekle" icon="plus" toneColor={calendarColor.color} compact loading={saving} disabled={!title.trim()} onPress={() => { void addEvent(); }} />
      </Card>
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  calendarCard: { padding: spacing.md, borderColor: '#3F78D4', borderWidth: 1.5, marginBottom: spacing.md },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  monthTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#3F78D4', textTransform: 'capitalize' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: colors.textSecondary, fontSize: 9, fontWeight: '600', paddingVertical: spacing.xs },
  dayCell: { width: '14.2857%', minHeight: 41, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 1 },
  dayBubble: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  dayText: { color: colors.text, fontSize: fontSize.sm },
  selectedDayText: { color: colors.white, fontWeight: '700' },
  dots: { flexDirection: 'row', height: 6, gap: 2, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#3F78D4', marginVertical: spacing.xs },
  emptyCard: { padding: spacing.sm, marginBottom: spacing.md },
  entryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, marginBottom: spacing.xs },
  entryMark: { width: 4, height: 34, borderRadius: 2 },
  entryCopy: { flex: 1 },
  entryTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  entryDetail: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  addCard: { padding: spacing.md, borderColor: '#3F78D4', borderWidth: 1.5, marginTop: spacing.md },
  addTitle: { color: '#3F78D4', fontSize: fontSize.sm, fontWeight: '700', marginBottom: spacing.sm },
  error: { color: colors.error, fontSize: fontSize.xs, marginBottom: spacing.xs },
});
