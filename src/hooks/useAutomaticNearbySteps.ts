import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Pedometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { CoupleLocation, CoupleSteps, presenceService } from '@/src/services/presenceService';

function distanceMeters(a: CoupleLocation, b: CoupleLocation) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** In foreground, shares current location and counts phone steps only while partners are close. */
export function useAutomaticNearbySteps(userId?: string, coupleId?: string, partnerId?: string) {
  const [locations, setLocations] = useState<CoupleLocation[]>([]);
  const [steps, setSteps] = useState<CoupleSteps[]>([]);
  const [error, setError] = useState('');
  const latestCount = useRef(0);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const stepWatcher = useRef<{ remove: () => void } | null>(null);
  const channelRemovers = useRef<Array<() => void>>([]);
  const lastWrite = useRef(0);
  const mine = locations.find((location) => location.userId === userId);
  const partner = locations.find((location) => location.userId === partnerId);
  const isNearby = !!mine && !!partner && Date.now() - new Date(partner.updatedAt).getTime() < 30000 && distanceMeters(mine, partner) <= 40;

  useEffect(() => {
    if (!userId || !coupleId || !partnerId) return;
    let disposed = false;
    let initializing = false;
    const day = todayLocal();

    const stopForeground = () => {
      locationWatcher.current?.remove(); locationWatcher.current = null;
      stepWatcher.current?.remove(); stepWatcher.current = null;
      channelRemovers.current.forEach((remove) => remove()); channelRemovers.current = [];
      void presenceService.clearLocation(userId);
      setLocations((current) => current.filter((location) => location.userId !== userId));
    };

    const startForeground = async () => {
      if (disposed || initializing || locationWatcher.current) return;
      initializing = true;
      try {
        const available = await Pedometer.isAvailableAsync();
        if (!available) { setError('Bu telefonda adım sayar sensörü bulunmuyor.'); return; }
        const [motionPermission, locationPermission] = await Promise.all([
          Pedometer.requestPermissionsAsync(),
          Location.requestForegroundPermissionsAsync(),
        ]);
        if (!motionPermission.granted || !locationPermission.granted) {
          setError('Otomatik adım sayımı için konum ve hareket izinleri gerekli.');
          return;
        }

        const [dailyRows, initialLocations] = await Promise.all([
          presenceService.steps(coupleId, day),
          presenceService.locations(coupleId),
        ]);
        if (disposed) return;
        setSteps(dailyRows);
        latestCount.current = dailyRows.find((row) => row.userId === userId)?.steps ?? 0;
        setLocations(initialLocations);
        setError('');

        const locationChannel = presenceService.channel(coupleId, 'couple_live_locations', () => {
          void presenceService.locations(coupleId).then(setLocations).catch(() => undefined);
        });
        const stepsChannel = presenceService.channel(coupleId, 'couple_daily_steps', () => {
          void presenceService.steps(coupleId, day).then(setSteps).catch(() => undefined);
        });
        channelRemovers.current = [
          () => { void locationChannel.unsubscribe(); },
          () => { void stepsChannel.unsubscribe(); },
        ];

        locationWatcher.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 5 },
          (position) => {
            const mine: CoupleLocation = {
              userId, coupleId, latitude: position.coords.latitude, longitude: position.coords.longitude,
              heading: position.coords.heading, updatedAt: new Date().toISOString(), directionEnabled: false,
            };
            setLocations((current) => [...current.filter((location) => location.userId !== userId), mine]);
            if (Date.now() - lastWrite.current >= 5000) {
              lastWrite.current = Date.now();
              void presenceService.updateLocation({ userId, coupleId, latitude: mine.latitude, longitude: mine.longitude, heading: mine.heading })
                .catch(() => setError('Konum paylaşımı başlatılamadı. Supabase ayarlarını kontrol edin.'));
            }
          },
        );
      } catch {
        if (!disposed) setError('Yakınlık algılama başlatılamadı. Konum iznini ve Supabase kurulumunu kontrol edin.');
      } finally {
        initializing = false;
      }
    };

    void startForeground();
    const appState = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void startForeground();
      else stopForeground();
    });
    return () => {
      disposed = true;
      appState.remove();
      stopForeground();
    };
  }, [userId, coupleId, partnerId]);

  useEffect(() => {
    if (!userId || !coupleId || !partnerId) return;
    if (!isNearby) { stepWatcher.current?.remove(); stepWatcher.current = null; return; }
    if (stepWatcher.current) return;
    const base = latestCount.current;
    stepWatcher.current = Pedometer.watchStepCount(({ steps: sessionSteps }) => {
      const count = base + sessionSteps;
      latestCount.current = count;
      setSteps((previous) => [...previous.filter((row) => row.userId !== userId), { userId, coupleId, localDate: todayLocal(), steps: count }]);
      void presenceService.saveSteps(coupleId, userId, todayLocal(), count).catch(() => setError('Adım sayısı ortak alana kaydedilemedi.'));
    });
    return () => { stepWatcher.current?.remove(); stepWatcher.current = null; };
  }, [userId, coupleId, partnerId, isNearby]);

  return { steps, error };
}
