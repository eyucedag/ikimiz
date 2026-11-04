import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { presenceService, CoupleLocation, bearingBetween } from '@/src/services/presenceService';
import { supabase } from '@/src/lib/supabase';

export function useCoupleDirection(coupleId?: string, userId?: string, partnerId?: string) {
  const [locations, setLocations] = useState<CoupleLocation[]>([]);
  const [heading, setHeading] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const subscriptions = useRef<{ remove: () => void }[]>([]);
  const lastWrite = useRef(0);

  const refresh = useCallback(async () => {
    if (!coupleId) return;
    try { setLocations(await presenceService.locations(coupleId)); } catch { setError('Konum paylaşım SQL’i henüz kurulmamış.'); }
  }, [coupleId]);

  const stop = useCallback(() => {
    subscriptions.current.forEach((subscription) => subscription.remove());
    subscriptions.current = [];
    if (userId) void presenceService.clearLocation(userId);
    setSharing(false);
  }, [userId]);

  const start = useCallback(async () => {
    if (!coupleId || !userId) return;
    setError('');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) { setError('Partner yönünü görmek için konum izni verin.'); return; }
    setSharing(true);
    subscriptions.current.push(await Location.watchHeadingAsync((value) => setHeading(value.trueHeading >= 0 ? value.trueHeading : value.magHeading)));
    subscriptions.current.push(await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 10000, distanceInterval: 10 }, (position) => {
      setLocations((current) => [...current.filter((item) => item.userId !== userId), {
        userId, coupleId, latitude: position.coords.latitude, longitude: position.coords.longitude,
        heading: position.coords.heading, updatedAt: new Date().toISOString(),
      }]);
      const now = Date.now();
      if (now - lastWrite.current >= 10000) {
        lastWrite.current = now;
        void presenceService.updateLocation({ userId, coupleId, latitude: position.coords.latitude, longitude: position.coords.longitude, heading: position.coords.heading }).catch(() => setError('Konum paylaşılmadı. Supabase kurulum SQL’ini çalıştırın.'));
      }
    }));
    await refresh();
  }, [coupleId, userId, refresh]);

  useEffect(() => {
    if (!coupleId) return;
    const channel = presenceService.channel(coupleId, 'couple_live_locations', () => { void refresh(); });
    void refresh();
    return () => { void supabase.removeChannel(channel); stop(); };
  }, [coupleId, refresh, stop]);

  useEffect(() => {
    const onState = (state: AppStateStatus) => { if (state !== 'active' && sharing) stop(); };
    const sub = AppState.addEventListener('change', onState);
    return () => sub.remove();
  }, [sharing, stop]);

  const angle = useMemo(() => {
    const mine = locations.find((item) => item.userId === userId);
    const partner = locations.find((item) => item.userId === partnerId);
    if (!mine || !partner || Date.now() - new Date(partner.updatedAt).getTime() > 120000) return null;
    return (bearingBetween(mine, partner) - heading + 360) % 360;
  }, [locations, userId, partnerId, heading]);

  return { angle, sharing, start, stop, error };
}
