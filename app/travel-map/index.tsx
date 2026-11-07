import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { findCoordinates, TravelPlace, travelService } from '@/src/services/travelService';
import { supabase } from '@/src/lib/supabase';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';
import { getCategoryColor } from '@/src/constants/categories';

const travelTone = getCategoryColor('gezilen-yerler');

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatLocalDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export default function TravelMapScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const { surfaceColor } = useAppAppearance();
  const [places, setPlaces] = useState<TravelPlace[]>([]);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Türkiye');
  const [note, setNote] = useState('');
  const [visitedOn, setVisitedOn] = useState(todayLocal());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingPlace, setEditingPlace] = useState<TravelPlace | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [draftDate, setDraftDate] = useState(parseLocalDate(visitedOn));
  const scrollRef = React.useRef<ScrollViewInstance>(null);

  const refresh = useCallback(async () => {
    if (!couple.couple?.id) return;
    try { setPlaces(await travelService.list(couple.couple.id)); } catch (e) { setError(e instanceof Error ? e.message : 'Gezilen yerler yüklenemedi.'); }
  }, [couple.couple?.id]);
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = supabase.channel(`travel-places-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'travel_places', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, refresh]);

  const savePlace = async () => {
    if (!user || !couple.couple || !city.trim() || !country.trim()) {
      setError('Şehir ve ülke adını yazın.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const locationUnchanged = editingPlace?.city === city.trim() && editingPlace.country === country.trim();
      const coordinates = locationUnchanged
        ? { latitude: editingPlace.latitude, longitude: editingPlace.longitude }
        : await findCoordinates(city.trim(), country.trim());
      const values = {
        city: city.trim(), country: country.trim(), note: note.trim() || null,
        ...coordinates, visitedOn: /^\d{4}-\d{2}-\d{2}$/.test(visitedOn) ? visitedOn : todayLocal(),
      };
      if (editingPlace) {
        const updated = await travelService.update(editingPlace.id, { ...values, partnerId: couple.partner?.id ?? '', coupleId: couple.couple.id });
        setPlaces((previous) => previous.map((place) => place.id === updated.id ? updated : place).sort((a, b) => b.visitedOn.localeCompare(a.visitedOn)));
      } else {
        const place = await travelService.add({ coupleId: couple.couple.id, ownerId: user.id, partnerId: couple.partner?.id ?? '', ...values });
        setPlaces((previous) => [place, ...previous].sort((a, b) => b.visitedOn.localeCompare(a.visitedOn)));
      }
      resetForm();
    } catch (e) { setError(e instanceof Error ? e.message : editingPlace ? 'Ziyaret düzenlenemedi.' : 'Yer eklenemedi.'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setCity(''); setCountry('Türkiye'); setNote(''); setVisitedOn(todayLocal());
    setEditingPlace(null); setError('');
  };

  const startEditing = (place: TravelPlace) => {
    setEditingPlace(place); setCity(place.city); setCountry(place.country);
    setNote(place.note ?? ''); setVisitedOn(place.visitedOn); setError('');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const onDateChange = (_event: unknown, date?: Date) => {
    if (date) setDraftDate(date);
    if (Platform.OS !== 'ios') {
      if (date) setVisitedOn(formatLocalDate(date));
      setShowDatePicker(false);
    }
  };

  const removePlace = (place: TravelPlace) => Alert.alert('Yeri kaldır', `${place.city}, ${place.country} haritadan kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await travelService.remove(place.id); setPlaces((previous) => previous.filter((item) => item.id !== place.id)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Yer kaldırılamadı.'); }
    } },
  ]);

  if (couple.loading) return <Screen title="Gezdiğimiz Yerler" toneColor={travelTone.color}><CoupleLoading /></Screen>;

  return (
    <Screen title="Gezdiğimiz Yerler" toneColor={travelTone.color} scrollRef={scrollRef}>
      <View style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: travelTone.tint }]}><Feather name="map-pin" size={20} color={travelTone.color} /></View>
        <Text style={styles.description}>Birlikte keşfettiğiniz şehirleri haritada işaretleyin.</Text>
      </View>
      {!couple.couple ? (
        <EmptyState icon="users" toneColor={travelTone.color} toneTint={travelTone.tint} title="Önce eşleşin" description="Gezilen yerleri ortak haritanızda görmek için partnerinizle eşleşmeniz gerekiyor." />
      ) : (
        <>
          <Card style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={{ latitude: 39, longitude: 35, latitudeDelta: 11, longitudeDelta: 20 }}
              accessibilityLabel="Birlikte gezilen şehirler haritası"
            >
              {places.map((place) => (
                <Marker key={place.id} coordinate={{ latitude: place.latitude, longitude: place.longitude }} title={`${place.city}, ${place.country}`} description={[`Ziyaret: ${place.visitedOn}`, place.note].filter(Boolean).join(' · ')} pinColor={travelTone.color} />
              ))}
            </MapView>
            {places.length === 0 ? <Text style={styles.mapHint}>İlk şehrinizi ekleyince haritada görünecek.</Text> : null}
          </Card>
          <Card style={styles.form}>
            <Text style={styles.formTitle}>{editingPlace ? 'Ziyareti düzenle' : 'Haritaya yer ekle'}</Text>
            <Input compact label="Ülke" placeholder="…" value={country} onChangeText={setCountry} autoCorrect={false} />
            <Input compact label="Şehir" placeholder="…" value={city} onChangeText={setCity} autoCorrect={false} />
            <Text style={styles.inputLabel}>Ziyaret tarihi</Text>
            <Pressable accessibilityRole="button" onPress={() => { setDraftDate(parseLocalDate(visitedOn)); setShowDatePicker(true); }} style={({ pressed }) => [styles.dateButton, { backgroundColor: surfaceColor }, pressed && styles.dateButtonPressed]}>
              <Feather name="calendar" size={17} color={travelTone.color} />
              <Text style={styles.dateText}>{parseLocalDate(visitedOn).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </Pressable>
            {showDatePicker && Platform.OS === 'android' ? (
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="default"
                design="material"
                title="Ziyaret tarihi"
                positiveButton={{ label: 'Tamam', textColor: travelTone.color }}
                negativeButton={{ label: 'Vazgeç', textColor: '#6B6763' }}
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            ) : null}
            <Modal visible={showDatePicker && Platform.OS === 'ios'} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
              <View style={styles.modalBackdrop}>
                <View style={[styles.dateModal, { backgroundColor: surfaceColor }]}>
                  <View style={styles.dateModalHeader}>
                    <Button title="Vazgeç" variant="ghost" compact toneColor={travelTone.color} onPress={() => setShowDatePicker(false)} />
                    <Text style={styles.dateModalTitle}>Ziyaret tarihi</Text>
                    <Button title="Tamam" variant="ghost" compact toneColor={travelTone.color} onPress={() => { setVisitedOn(formatLocalDate(draftDate)); setShowDatePicker(false); }} />
                  </View>
                  <DateTimePicker value={draftDate} mode="date" display="spinner" locale="tr-TR" themeVariant="light" textColor="#2D2D2D" accentColor={travelTone.color} maximumDate={new Date()} onChange={onDateChange} />
                </View>
              </View>
            </Modal>
            <Input compact label="Not (isteğe bağlı)" placeholder="…" value={note} onChangeText={setNote} multiline style={styles.noteInput} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={editingPlace ? 'Değişiklikleri kaydet' : 'Haritaya ekle'} icon={editingPlace ? 'save' : 'map-pin'} compact toneColor={travelTone.color} loading={loading} onPress={() => { void savePlace(); }} style={styles.addButton} />
            {editingPlace ? <Button title="Düzenlemekten vazgeç" variant="ghost" compact onPress={resetForm} style={styles.cancelEdit} toneColor={travelTone.color} /> : null}
          </Card>
          <Text style={styles.listTitle}>Ziyaretleriniz · {places.length}</Text>
          {places.map((place) => (
            <Card key={place.id} style={styles.placeRow}>
              <View style={[styles.pin, { backgroundColor: travelTone.tint }]}><Feather name="map-pin" size={16} color={travelTone.color} /></View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.city}, {place.country}</Text>
                <Text style={styles.placeDate}>{place.visitedOn}</Text>
                {place.note ? <Text style={styles.placeNote}>{place.note}</Text> : null}
              </View>
              <View style={styles.placeActions}>
                <Button title="Düzenle" icon="edit-2" variant="ghost" compact onPress={() => startEditing(place)} toneColor={travelTone.color} />
                {place.ownerId === user?.id ? <Button title="Kaldır" variant="ghost" compact onPress={() => removePlace(place)} toneColor="#A64B58" /> : null}
              </View>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xs, marginBottom: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  description: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: fontSize.xs, textAlign: 'center' },
  mapCard: { overflow: 'hidden', padding: 0, marginBottom: spacing.md, borderWidth: 1, borderColor: travelTone.color },
  map: { height: 230, width: '100%' },
  mapHint: { padding: spacing.sm, textAlign: 'center', color: colors.textSecondary, fontSize: fontSize.xs },
  form: { borderWidth: 1, borderColor: travelTone.color, marginBottom: spacing.md, padding: spacing.md },
  formTitle: { fontSize: fontSize.sm, fontWeight: '700', color: travelTone.color, marginBottom: spacing.xs },
  error: { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.sm },
  addButton: { marginTop: spacing.xs },
  noteInput: { minHeight: 58, textAlignVertical: 'top' },
  inputLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '500' },
  dateButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.card, paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  dateButtonPressed: { opacity: 0.65 },
  dateText: { marginLeft: spacing.sm, color: colors.text, fontSize: fontSize.sm },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  dateModal: { backgroundColor: colors.card, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingBottom: spacing.xl },
  dateModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateModalTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  cancelEdit: { marginTop: spacing.xs },
  listTitle: { color: travelTone.color, fontWeight: '700', fontSize: fontSize.md, marginBottom: spacing.sm },
  placeRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: travelTone.color, marginBottom: spacing.md, paddingVertical: spacing.md },
  pin: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, marginRight: spacing.sm },
  placeInfo: { flex: 1 },
  placeActions: { alignItems: 'flex-end' },
  placeName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  placeDate: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  placeNote: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs, lineHeight: 18 },
});
