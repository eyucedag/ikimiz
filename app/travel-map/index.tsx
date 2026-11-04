import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, EmptyState, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { findCoordinates, TravelPlace, travelService } from '@/src/services/travelService';
import { supabase } from '@/src/lib/supabase';

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function TravelMapScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const [places, setPlaces] = useState<TravelPlace[]>([]);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [visitedOn, setVisitedOn] = useState(todayLocal());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const addPlace = async () => {
    if (!user || !couple.couple || !city.trim() || !country.trim()) {
      setError('Şehir ve ülke adını yazın.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const coordinates = await findCoordinates(city.trim(), country.trim());
      const place = await travelService.add({
        coupleId: couple.couple.id, ownerId: user.id, city: city.trim(), country: country.trim(),
        ...coordinates, visitedOn: /^\d{4}-\d{2}-\d{2}$/.test(visitedOn) ? visitedOn : todayLocal(),
      });
      setPlaces((previous) => [place, ...previous]);
      setCity(''); setCountry(''); setVisitedOn(todayLocal());
    } catch (e) { setError(e instanceof Error ? e.message : 'Yer eklenemedi.'); }
    finally { setLoading(false); }
  };

  const removePlace = (place: TravelPlace) => Alert.alert('Yeri kaldır', `${place.city}, ${place.country} haritadan kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await travelService.remove(place.id); setPlaces((previous) => previous.filter((item) => item.id !== place.id)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Yer kaldırılamadı.'); }
    } },
  ]);

  return (
    <Screen title="Gezdiğimiz Yerler">
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
              initialRegion={{ latitude: 24, longitude: 10, latitudeDelta: 105, longitudeDelta: 210 }}
              accessibilityLabel="Birlikte gezilen şehirler haritası"
            >
              {places.map((place) => (
                <Marker key={place.id} coordinate={{ latitude: place.latitude, longitude: place.longitude }} title={`${place.city}, ${place.country}`} description={`Ziyaret: ${place.visitedOn}`} pinColor="#0B8F87" />
              ))}
            </MapView>
            {places.length === 0 ? <Text style={styles.mapHint}>İlk şehrinizi ekleyince haritada görünecek.</Text> : null}
          </Card>
          <Card style={styles.form}>
            <Text style={styles.formTitle}>Haritaya yer ekle</Text>
            <Input label="Şehir" placeholder="Örn. Roma" value={city} onChangeText={setCity} />
            <Input label="Ülke" placeholder="Örn. İtalya" value={country} onChangeText={setCountry} />
            <Input label="Ziyaret tarihi" placeholder="YYYY-AA-GG" value={visitedOn} onChangeText={setVisitedOn} />
            <Text style={styles.privacy}>Konumu haritada bulmak için şehir ve ülke adları OpenStreetMap’e gönderilir.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Haritaya ekle" icon="map-pin" toneColor="#0B8F87" loading={loading} onPress={() => { void addPlace(); }} style={styles.addButton} />
          </Card>
          <Text style={styles.listTitle}>Ziyaretleriniz · {places.length}</Text>
          {places.map((place) => (
            <Card key={place.id} style={styles.placeRow}>
              <View style={styles.pin}><Feather name="map-pin" size={16} color="#0B8F87" /></View>
              <View style={styles.placeInfo}><Text style={styles.placeName}>{place.city}, {place.country}</Text><Text style={styles.placeDate}>{place.visitedOn}</Text></View>
              {place.ownerId === user?.id ? <Button title="Kaldır" variant="ghost" compact onPress={() => removePlace(place)} toneColor="#A64B58" /> : null}
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
  privacy: { fontSize: fontSize.xs, color: colors.textTertiary, lineHeight: 16, marginTop: spacing.xs },
  error: { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.sm },
  addButton: { marginTop: spacing.md },
  listTitle: { color: '#0B8F87', fontWeight: '700', fontSize: fontSize.md, marginBottom: spacing.sm },
  placeRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#0B8F87', marginBottom: spacing.sm, paddingVertical: spacing.sm },
  pin: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, backgroundColor: '#D8F4EF', marginRight: spacing.sm },
  placeInfo: { flex: 1 },
  placeName: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  placeDate: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
});
