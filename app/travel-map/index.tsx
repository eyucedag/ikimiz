import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, ScrollViewInstance, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, EmptyState, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { CityOption, searchCities, TravelPlace, travelService } from '@/src/services/travelService';
import { supabase } from '@/src/lib/supabase';

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

const COUNTRIES = [
  'Türkiye', 'Almanya', 'Amerika Birleşik Devletleri', 'Arnavutluk', 'Avustralya', 'Avusturya', 'Azerbaycan', 'Birleşik Arap Emirlikleri',
  'Belçika', 'Birleşik Krallık', 'Bosna-Hersek', 'Brezilya', 'Bulgaristan', 'Çekya', 'Çin', 'Danimarka', 'Endonezya',
  'Fas', 'Finlandiya', 'Fransa', 'Gürcistan', 'Güney Kore', 'Hırvatistan', 'Hindistan', 'Hollanda', 'Irak', 'İran',
  'İrlanda', 'İspanya', 'İsrail', 'İsveç', 'İsviçre', 'İtalya', 'Japonya', 'Kanada', 'Karadağ', 'Katar', 'Kazakistan',
  'Kıbrıs', 'Kolombiya', 'Kuzey Makedonya', 'Macaristan', 'Maldivler', 'Meksika', 'Mısır', 'Norveç', 'Pakistan',
  'Polonya', 'Portekiz', 'Romanya', 'Rusya', 'Sırbistan', 'Singapur', 'Suudi Arabistan', 'Tayland', 'Ukrayna', 'Ürdün',
  'Vietnam', 'Yunanistan',
];

export default function TravelMapScreen() {
  const { user } = useAuth();
  const couple = useCouple();
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
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectionModal, setSelectionModal] = useState<'country' | 'city' | null>(null);
  const [selectionSearch, setSelectionSearch] = useState('');
  const [cityOptions, setCityOptions] = useState<CityOption[]>([]);
  const [searchingCities, setSearchingCities] = useState(false);
  const [selectionError, setSelectionError] = useState('');
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

  useEffect(() => {
    if (selectionModal !== 'city' || selectionSearch.trim().length < 2) {
      setCityOptions([]);
      setSearchingCities(false);
      return;
    }
    let active = true;
    const timeout = setTimeout(() => {
      setSearchingCities(true);
      setSelectionError('');
      void searchCities(selectionSearch.trim(), country)
        .then((options) => { if (active) setCityOptions(options); })
        .catch((error) => { if (active) setSelectionError(error instanceof Error ? error.message : 'Şehirler yüklenemedi.'); })
        .finally(() => { if (active) setSearchingCities(false); });
    }, 350);
    return () => { active = false; clearTimeout(timeout); };
  }, [selectionModal, selectionSearch, country]);

  const savePlace = async () => {
    if (!user || !couple.couple || !city.trim() || !country.trim()) {
      setError('Şehir ve ülke adını yazın.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const locationUnchanged = editingPlace?.city === city.trim() && editingPlace.country === country.trim();
      const coordinates = selectedCoordinates ?? (locationUnchanged
        ? { latitude: editingPlace.latitude, longitude: editingPlace.longitude }
        : null);
      if (!coordinates) throw new Error('Haritada işaretlemek için şehir listesinden bir şehir seçin.');
      const values = {
        city: city.trim(), country: country.trim(), note: note.trim() || null,
        ...coordinates, visitedOn: /^\d{4}-\d{2}-\d{2}$/.test(visitedOn) ? visitedOn : todayLocal(),
      };
      if (editingPlace) {
        const updated = await travelService.update(editingPlace.id, values);
        setPlaces((previous) => previous.map((place) => place.id === updated.id ? updated : place).sort((a, b) => b.visitedOn.localeCompare(a.visitedOn)));
      } else {
        const place = await travelService.add({ coupleId: couple.couple.id, ownerId: user.id, ...values });
        setPlaces((previous) => [place, ...previous].sort((a, b) => b.visitedOn.localeCompare(a.visitedOn)));
      }
      resetForm();
    } catch (e) { setError(e instanceof Error ? e.message : editingPlace ? 'Ziyaret düzenlenemedi.' : 'Yer eklenemedi.'); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setCity(''); setCountry('Türkiye'); setNote(''); setVisitedOn(todayLocal());
    setEditingPlace(null); setSelectedCoordinates(null); setError('');
  };

  const startEditing = (place: TravelPlace) => {
    setEditingPlace(place); setCity(place.city); setCountry(place.country);
    setNote(place.note ?? ''); setVisitedOn(place.visitedOn); setSelectedCoordinates({ latitude: place.latitude, longitude: place.longitude }); setError('');
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const chooseCountry = (value: string) => {
    setCountry(value); setCity(''); setSelectedCoordinates(null);
    setSelectionSearch(''); setSelectionModal(null);
  };

  const chooseCity = (option: CityOption) => {
    setCity(option.city);
    setSelectedCoordinates({ latitude: option.latitude, longitude: option.longitude });
    setSelectionSearch(''); setSelectionModal(null);
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

  return (
    <Screen title="Gezdiğimiz Yerler" scrollRef={scrollRef}>
      <View style={styles.hero}>
        <View style={styles.icon}><Feather name="map-pin" size={24} color="#0B8F87" /></View>
        <Text style={styles.description}>Birlikte keşfettiğiniz şehirleri haritada işaretleyin.</Text>
      </View>
      {!couple.couple ? (
        <EmptyState icon="users" title="Önce eşleşin" description="Gezilen yerleri ortak haritanızda görmek için partnerinizle eşleşmeniz gerekiyor." />
      ) : (
        <>
          <Card style={styles.mapCard}>
            <MapView
              style={styles.map}
              initialRegion={{ latitude: 39, longitude: 35, latitudeDelta: 11, longitudeDelta: 20 }}
              accessibilityLabel="Birlikte gezilen şehirler haritası"
            >
              {places.map((place) => (
                <Marker key={place.id} coordinate={{ latitude: place.latitude, longitude: place.longitude }} title={`${place.city}, ${place.country}`} description={[`Ziyaret: ${place.visitedOn}`, place.note].filter(Boolean).join(' · ')} pinColor="#0B8F87" />
              ))}
            </MapView>
            {places.length === 0 ? <Text style={styles.mapHint}>İlk şehrinizi ekleyince haritada görünecek.</Text> : null}
          </Card>
          <Card style={styles.form}>
            <Text style={styles.formTitle}>{editingPlace ? 'Ziyareti düzenle' : 'Haritaya yer ekle'}</Text>
            <Text style={styles.inputLabel}>Ülke</Text>
            <Pressable accessibilityRole="button" onPress={() => { setSelectionSearch(''); setSelectionModal('country'); }} style={({ pressed }) => [styles.selectButton, pressed && styles.dateButtonPressed]}>
              <Text style={styles.dateText}>{country || 'Ülke seç'}</Text><Feather name="chevron-down" size={18} color="#0B8F87" />
            </Pressable>
            <Text style={styles.inputLabel}>Şehir</Text>
            <Pressable accessibilityRole="button" onPress={() => { setSelectionSearch(''); setSelectionError(''); setSelectionModal('city'); }} style={({ pressed }) => [styles.selectButton, pressed && styles.dateButtonPressed]}>
              <Text style={[styles.dateText, !city && styles.selectionPlaceholder]}>{city || 'Şehir seç'}</Text><Feather name="chevron-down" size={18} color="#0B8F87" />
            </Pressable>
            <Text style={styles.inputLabel}>Ziyaret tarihi</Text>
            <Pressable accessibilityRole="button" onPress={() => { setDraftDate(parseLocalDate(visitedOn)); setShowDatePicker(true); }} style={({ pressed }) => [styles.dateButton, pressed && styles.dateButtonPressed]}>
              <Feather name="calendar" size={17} color="#0B8F87" />
              <Text style={styles.dateText}>{parseLocalDate(visitedOn).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            </Pressable>
            {showDatePicker && Platform.OS === 'android' ? (
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="default"
                design="material"
                title="Ziyaret tarihi"
                positiveButton={{ label: 'Tamam', textColor: '#0B8F87' }}
                negativeButton={{ label: 'Vazgeç', textColor: '#6B6763' }}
                maximumDate={new Date()}
                onChange={onDateChange}
              />
            ) : null}
            <Modal visible={showDatePicker && Platform.OS === 'ios'} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
              <View style={styles.modalBackdrop}>
                <View style={styles.dateModal}>
                  <View style={styles.dateModalHeader}>
                    <Button title="Vazgeç" variant="ghost" compact onPress={() => setShowDatePicker(false)} />
                    <Text style={styles.dateModalTitle}>Ziyaret tarihi</Text>
                    <Button title="Tamam" variant="ghost" compact toneColor="#0B8F87" onPress={() => { setVisitedOn(formatLocalDate(draftDate)); setShowDatePicker(false); }} />
                  </View>
                  <DateTimePicker value={draftDate} mode="date" display="spinner" locale="tr-TR" themeVariant="light" textColor="#2D2D2D" accentColor="#0B8F87" maximumDate={new Date()} onChange={onDateChange} />
                </View>
              </View>
            </Modal>
            <Input label="Not (isteğe bağlı)" placeholder="…" value={note} onChangeText={setNote} multiline style={styles.noteInput} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title={editingPlace ? 'Değişiklikleri kaydet' : 'Haritaya ekle'} icon={editingPlace ? 'save' : 'map-pin'} toneColor="#0B8F87" loading={loading} onPress={() => { void savePlace(); }} style={styles.addButton} />
            {editingPlace ? <Button title="Düzenlemekten vazgeç" variant="ghost" onPress={resetForm} style={styles.cancelEdit} toneColor="#0B8F87" /> : null}
          </Card>
          <Modal visible={selectionModal !== null} transparent animationType="slide" onRequestClose={() => setSelectionModal(null)}>
            <View style={styles.modalBackdrop}>
              <View style={styles.selectionModal}>
                <View style={styles.dateModalHeader}>
                  <Button title="Kapat" variant="ghost" compact onPress={() => setSelectionModal(null)} />
                  <Text style={styles.dateModalTitle}>{selectionModal === 'country' ? 'Ülke seç' : 'Şehir seç'}</Text>
                  <View style={styles.modalSpacer} />
                </View>
                <Input
                  label={selectionModal === 'country' ? 'Ülke ara' : `${country} içinde şehir ara`}
                  placeholder={selectionModal === 'country' ? 'Ülke adı' : 'Şehir adı'}
                  value={selectionSearch}
                  onChangeText={setSelectionSearch}
                  autoCorrect={false}
                />
                {selectionModal === 'country' ? (
                  <ScrollView keyboardShouldPersistTaps="handled" style={styles.optionsList}>
                    {COUNTRIES.filter((item) => item.toLocaleLowerCase('tr').includes(selectionSearch.trim().toLocaleLowerCase('tr'))).map((item) => (
                      <Pressable key={item} onPress={() => chooseCountry(item)} style={styles.optionRow}>
                        <Text style={styles.optionText}>{item}</Text>
                        {item === country ? <Feather name="check" size={18} color="#0B8F87" /> : null}
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : (
                  <ScrollView keyboardShouldPersistTaps="handled" style={styles.optionsList}>
                    {searchingCities ? <Text style={styles.selectionMessage}>Şehirler aranıyor…</Text> : null}
                    {selectionError ? <Text style={styles.selectionMessage}>{selectionError}</Text> : null}
                    {!searchingCities && selectionSearch.trim().length >= 2 && cityOptions.length === 0 && !selectionError ? <Text style={styles.selectionMessage}>Eşleşen şehir bulunamadı.</Text> : null}
                    {cityOptions.map((option) => (
                      <Pressable key={option.id} onPress={() => chooseCity(option)} style={styles.optionRow}>
                        <View style={styles.optionCopy}><Text style={styles.optionText}>{option.city}</Text><Text style={styles.optionSubtext}>{option.country}</Text></View>
                        {option.city === city && option.country === country ? <Feather name="check" size={18} color="#0B8F87" /> : null}
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>
          <Text style={styles.listTitle}>Ziyaretleriniz · {places.length}</Text>
          {places.map((place) => (
            <Card key={place.id} style={styles.placeRow}>
              <View style={styles.pin}><Feather name="map-pin" size={16} color="#0B8F87" /></View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.city}, {place.country}</Text>
                <Text style={styles.placeDate}>{place.visitedOn}</Text>
                {place.note ? <Text style={styles.placeNote}>{place.note}</Text> : null}
              </View>
              <View style={styles.placeActions}>
                <Button title="Düzenle" icon="edit-2" variant="ghost" compact onPress={() => startEditing(place)} toneColor="#0B8F87" />
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
  hero: { alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D8F4EF' },
  description: { marginTop: spacing.sm, color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center' },
  mapCard: { overflow: 'hidden', padding: 0, marginBottom: spacing.lg, borderWidth: 1.5, borderColor: '#0B8F87' },
  map: { height: 340, width: '100%' },
  mapHint: { padding: spacing.sm, textAlign: 'center', color: colors.textSecondary, fontSize: fontSize.xs },
  form: { borderWidth: 1.5, borderColor: '#0B8F87', marginBottom: spacing.lg },
  formTitle: { fontSize: fontSize.md, fontWeight: '700', color: '#0B8F87', marginBottom: spacing.sm },
  error: { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.sm },
  addButton: { marginTop: spacing.md },
  noteInput: { minHeight: 80, textAlignVertical: 'top' },
  inputLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs, fontWeight: '500' },
  selectButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.card, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  selectionPlaceholder: { color: colors.textTertiary },
  dateButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.control, backgroundColor: colors.card, paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  dateButtonPressed: { opacity: 0.65 },
  dateText: { marginLeft: spacing.sm, color: colors.text, fontSize: fontSize.md },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  dateModal: { backgroundColor: colors.card, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingBottom: spacing.xl },
  selectionModal: { maxHeight: '82%', backgroundColor: colors.card, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingBottom: spacing.lg },
  dateModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  dateModalTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  modalSpacer: { width: 64 },
  optionsList: { flexGrow: 0, maxHeight: 420, paddingHorizontal: spacing.lg },
  optionRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  optionCopy: { flex: 1 },
  optionText: { color: colors.text, fontSize: fontSize.md },
  optionSubtext: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  selectionMessage: { color: colors.textSecondary, fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg },
  cancelEdit: { marginTop: spacing.xs },
  listTitle: { color: '#0B8F87', fontWeight: '700', fontSize: fontSize.md, marginBottom: spacing.sm },
  placeRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#0B8F87', marginBottom: spacing.sm, paddingVertical: spacing.sm },
  pin: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, backgroundColor: '#D8F4EF', marginRight: spacing.sm },
  placeInfo: { flex: 1 },
  placeActions: { alignItems: 'flex-end' },
  placeName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  placeDate: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  placeNote: { color: colors.textSecondary, fontSize: fontSize.sm, marginTop: spacing.xs, lineHeight: 18 },
});
