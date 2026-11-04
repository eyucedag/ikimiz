import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { Button, Card, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { CoupleLocation, CoupleSteps, presenceService } from '@/src/services/presenceService';
import { supabase } from '@/src/lib/supabase';

const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function StepsScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const [rows, setRows] = useState<CoupleSteps[]>([]);
  const [sensorSteps, setSensorSteps] = useState(0);
  const [locations, setLocations] = useState<CoupleLocation[]>([]);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(false);
  const stepSubscription = useRef<{ remove: () => void } | null>(null);
  const locationSubscription = useRef<{ remove: () => void } | null>(null);
  const today = localDate();

  const refresh = useCallback(async () => {
    if (!couple.couple?.id) return;
    try { setRows(await presenceService.steps(couple.couple.id, today)); } catch { setError('Adım kayıtları yüklenemedi. Supabase kurulum SQL’ini çalıştırın.'); }
  }, [couple.couple?.id, today]);
  const refreshLocations = useCallback(async () => {
    if (!couple.couple?.id) return;
    try { setLocations(await presenceService.locations(couple.couple.id)); } catch { setError('Yakınlık algılama için Supabase konum SQL’ini çalıştırın.'); }
  }, [couple.couple?.id]);
  useFocusEffect(useCallback(() => { void refresh(); void refreshLocations(); }, [refresh, refreshLocations]));

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const stepsChannel = presenceService.channel(coupleId, 'couple_daily_steps', () => { void refresh(); });
    const locationsChannel = presenceService.channel(coupleId, 'couple_live_locations', () => { void refreshLocations(); });
    return () => { void supabase.removeChannel(stepsChannel); void supabase.removeChannel(locationsChannel); };
  }, [couple.couple?.id, refresh, refreshLocations]);

  useEffect(() => { void Pedometer.isAvailableAsync().then(setAvailable); }, []);

  const begin = async () => {
    if (!user || !couple.couple) return;
    setError('');
    try {
      const permission = await Pedometer.requestPermissionsAsync();
      if (!permission.granted) throw new Error('Telefonun adım sayar izni verilmedi.');
      if (!await Pedometer.isAvailableAsync()) throw new Error('Bu telefonda adım sayar sensörü bulunmuyor.');
      const locationPermission = await Location.requestForegroundPermissionsAsync();
      if (!locationPermission.granted) throw new Error('Birlikte yakın olduğunuzu anlamak için uygulama açıkken konum izni de gerekli.');
      try {
        const [todayRows, activeLocations] = await Promise.all([
          presenceService.steps(couple.couple.id, today),
          presenceService.locations(couple.couple.id),
        ]);
        setRows(todayRows);
        setLocations(activeLocations);
      } catch {
        throw new Error('Adım paylaşımı için gerekli Supabase SQL’i henüz çalıştırılmamış. SQL Editor’da 20261104_shared_steps_location_relationship.sql dosyasını çalıştırın.');
      }
      setTracking(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Yakınlık algılama başlatılamadı.'); }
  };

  useFocusEffect(useCallback(() => {
    if (!tracking || !user || !couple.couple) return;
    let active = true;
    void Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 5 }, (position) => {
      const mine: CoupleLocation = {
        userId: user.id, coupleId: couple.couple!.id,
        latitude: position.coords.latitude, longitude: position.coords.longitude,
        heading: position.coords.heading, updatedAt: new Date().toISOString(),
      };
      setLocations((current) => [...current.filter((item) => item.userId !== user.id), mine]);
      void presenceService.updateLocation(mine).catch(() => setError('Konum paylaşılmadı. Supabase kurulum SQL’ini çalıştırın.'));
    }).then((subscription) => { if (active) locationSubscription.current = subscription; else subscription.remove(); });
    return () => {
      active = false;
      locationSubscription.current?.remove(); locationSubscription.current = null;
      stepSubscription.current?.remove(); stepSubscription.current = null;
      void presenceService.clearLocation(user.id);
      setLocations((current) => current.filter((item) => item.userId !== user.id));
    };
  }, [tracking, user, couple.couple]));

  useEffect(() => {
    if (!tracking || !user || !couple.partner || !couple.couple) return;
    const mine = locations.find((location) => location.userId === user.id);
    const partner = locations.find((location) => location.userId === couple.partner!.id);
    const nearby = !!mine && !!partner && Date.now() - new Date(partner.updatedAt).getTime() < 30000 && distanceMeters(mine, partner) <= 40;
    if (!nearby) { stepSubscription.current?.remove(); stepSubscription.current = null; return; }
    if (stepSubscription.current) return;
    const baseline = rows.find((row) => row.userId === user.id)?.steps ?? sensorSteps;
    stepSubscription.current = Pedometer.watchStepCount(({ steps }) => {
      const count = baseline + steps;
      setSensorSteps(count);
      void presenceService.saveSteps(couple.couple!.id, user.id, today, count)
        .then(refresh)
        .catch(() => setError('Adımlar paylaşılmadı. Supabase SQL kurulumunu kontrol edin.'));
    });
  }, [tracking, user, couple.partner, couple.couple, locations, rows, sensorSteps, today, refresh]);

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.steps, 0), [rows]);
  const bothActive = !!user && !!couple.partner && locations.some((location) => location.userId === user.id) && locations.some((location) => location.userId === couple.partner?.id);
  if (!couple.couple) return <Screen title="Birlikte Atılan Adımlar"><EmptyState icon="users" title="Önce eşleşin" description="Ortak adım sayacı partnerinizle eşleşince kullanılabilir." /></Screen>;

  return (
    <Screen title="Birlikte Atılan Adımlar">
      <Card style={styles.hero}>
        <View style={styles.icon}><Feather name="activity" size={24} color="#1676E8" /></View>
        <Text style={styles.total}>{total.toLocaleString('tr-TR')}</Text>
        <Text style={styles.caption}>bugün birlikte atılan adım</Text>
        <Text style={styles.detail}>İkiniz de bu ekranda yakınlık algılamayı açın. Telefonlarınız 40 metre içindeyken adım sensörleri saymaya başlar; ayrılınca durur.</Text>
      </Card>
      <Card style={styles.rows}>
        {[{ id: user?.id, name: 'Sen' }, { id: couple.partner?.id, name: couple.partner?.displayName ?? 'Partnerin' }].map((person) => {
          const count = rows.find((row) => row.userId === person.id)?.steps ?? (person.id === user?.id ? sensorSteps : 0);
          return <View key={person.id} style={styles.personRow}><Text style={styles.person}>{person.name}</Text><Text style={styles.count}>{count.toLocaleString('tr-TR')}</Text></View>;
        })}
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {available === false ? <Text style={styles.error}>Bu telefonda uyumlu adım sayar yok.</Text> : null}
      <Button title={tracking ? 'Yakınlık algılama açık' : 'Yakınlık algılamayı başlat'} icon="activity" onPress={() => { void begin(); }} disabled={tracking || available === false} toneColor="#1676E8" style={styles.start} />
      {tracking ? <Text style={styles.status}>{bothActive ? 'İkiniz de bulundu. 40 metre içinde adımlar sayılacak.' : 'İkinizin de uygulamayı açık tutup bu özelliği başlatması gerekir.'}</Text> : null}
    </Screen>
  );
}

function distanceMeters(a: Pick<CoupleLocation, 'latitude' | 'longitude'>, b: Pick<CoupleLocation, 'latitude' | 'longitude'>) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', paddingVertical: spacing.xl, borderColor: '#1676E8', borderWidth: 1.5 },
  icon: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#DFEBFF', alignItems: 'center', justifyContent: 'center' },
  total: { color: '#1676E8', fontSize: 44, fontWeight: '800', marginTop: spacing.md },
  caption: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  detail: { color: colors.textSecondary, textAlign: 'center', fontSize: fontSize.sm, marginTop: spacing.md, lineHeight: 20 },
  rows: { marginTop: spacing.md, paddingVertical: 0, borderColor: '#1676E8', borderWidth: 1.5 },
  personRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  person: { color: colors.text, fontSize: fontSize.md }, count: { color: '#1676E8', fontSize: fontSize.md, fontWeight: '700' },
  error: { color: colors.error, marginTop: spacing.sm }, start: { marginTop: spacing.md },
  status: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
});
