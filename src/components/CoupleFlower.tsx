import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '@/src/constants/theme';
import { coupleFlowerService, CoupleFlowerState, flowerHealthNow } from '@/src/services/coupleFlowerService';
import { supabase } from '@/src/lib/supabase';

export function CoupleFlower({ coupleId }: { coupleId: string }) {
  const [flower, setFlower] = useState<CoupleFlowerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);
  const [now, setNow] = useState(Date.now());
  const health = flower ? flowerHealthNow(flower, now) : 72;
  const animatedHealth = useRef(new Animated.Value(health)).current;
  const leafColor = animatedHealth.interpolate({ inputRange: [0, 42, 100], outputRange: ['#9D785B', '#88A565', '#3F9654'] });
  const flowerOpacity = animatedHealth.interpolate({ inputRange: [0, 28, 100], outputRange: [0.18, 0.55, 1] });

  const refresh = useCallback(async () => {
    try {
      setFlower(await coupleFlowerService.get(coupleId));
    } catch (error) {
      // Keep the illustration visible; show setup errors only when watering is attempted.
      console.warn('Couple flower state unavailable:', error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
      setNow(Date.now());
    }
  }, [coupleId]);

  useEffect(() => {
    setLoading(true);
    setFlower(null);
    void refresh();
    const channel = supabase.channel(`couple-flower-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'couple_flower_state', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(); })
      .subscribe();
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') { setNow(Date.now()); void refresh(); }
    });
    const decayTimer = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      clearInterval(decayTimer);
      appStateListener.remove();
      void supabase.removeChannel(channel);
    };
  }, [coupleId, refresh]);

  useEffect(() => {
    Animated.timing(animatedHealth, { toValue: health, duration: 1500, useNativeDriver: false }).start();
  }, [animatedHealth, health]);

  const water = async () => {
    if (watering || loading) return;
    setWatering(true);
    try {
      const next = await coupleFlowerService.water(coupleId);
      setFlower(next);
      setNow(Date.now());
    } catch (error) {
      Alert.alert('Çiçek sulanamadı', error instanceof Error ? error.message : 'Bağlantınızı kontrol edip yeniden deneyin.');
    } finally {
      setWatering(false);
    }
  };

  const status = health < 20 ? 'Susadı' : health < 55 ? 'Biraz kuruyor' : 'Birlikte büyüyor';

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Text style={styles.status}>{status}</Text>
      <View style={styles.plantArea}>
        <View style={styles.stem} />
        <Animated.View style={[styles.leaf, styles.leafLeftLow, { backgroundColor: leafColor, transform: [{ rotate: animatedHealth.interpolate({ inputRange: [0, 100], outputRange: ['-58deg', '-28deg'] }) }] }]} />
        <Animated.View style={[styles.leaf, styles.leafRightLow, { backgroundColor: leafColor, transform: [{ rotate: animatedHealth.interpolate({ inputRange: [0, 100], outputRange: ['62deg', '28deg'] }) }] }]} />
        <Animated.View style={[styles.leaf, styles.leafLeftHigh, { backgroundColor: leafColor, opacity: animatedHealth.interpolate({ inputRange: [0, 100], outputRange: [0.6, 1] }), transform: [{ rotate: animatedHealth.interpolate({ inputRange: [0, 100], outputRange: ['-66deg', '-35deg'] }) }] }]} />
        <Animated.View style={[styles.leaf, styles.leafRightHigh, { backgroundColor: leafColor, opacity: animatedHealth.interpolate({ inputRange: [0, 100], outputRange: [0.6, 1] }), transform: [{ rotate: animatedHealth.interpolate({ inputRange: [0, 100], outputRange: ['67deg', '34deg'] }) }] }]} />
        <Animated.View style={[styles.blossom, { opacity: flowerOpacity, transform: [{ scale: animatedHealth.interpolate({ inputRange: [0, 100], outputRange: [0.72, 1] }) }] }]}>
          <View style={[styles.petal, styles.petalTop]} /><View style={[styles.petal, styles.petalRight]} /><View style={[styles.petal, styles.petalBottom]} /><View style={[styles.petal, styles.petalLeft]} />
          <View style={styles.flowerCenter} />
        </Animated.View>
        <View style={styles.potRim} /><View style={styles.pot} />
      </View>
      <View style={styles.shelf}><View style={styles.shelfBracket} /><View style={[styles.shelfBracket, styles.shelfBracketRight]} /></View>
      <Pressable onPress={() => { void water(); }} disabled={loading || watering} accessibilityRole="button" accessibilityLabel="Ortak çiçeği sula" style={({ pressed }) => [styles.waterButton, pressed && styles.pressed, (loading || watering) && styles.disabled]}>
        {loading || watering ? <ActivityIndicator size="small" color={colors.white} /> : <><Feather name="droplet" size={13} color={colors.white} /><Text style={styles.waterText}>Sula</Text></>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { position: 'absolute', right: 8, top: '39%', width: 78, alignItems: 'center', zIndex: 5 },
  status: { color: '#FFF9EB', fontSize: 9, lineHeight: 12, fontWeight: '700', textShadowColor: 'rgba(29,45,32,0.85)', textShadowRadius: 3, marginBottom: 2 },
  plantArea: { width: 58, height: 79, alignItems: 'center', justifyContent: 'flex-end' },
  stem: { position: 'absolute', bottom: 20, width: 3, height: 50, borderRadius: 2, backgroundColor: '#64804F' },
  leaf: { position: 'absolute', width: 20, height: 10, borderRadius: 10 },
  leafLeftLow: { left: 11, bottom: 34 },
  leafRightLow: { right: 10, bottom: 40 },
  leafLeftHigh: { left: 13, bottom: 49, width: 17, height: 9 },
  leafRightHigh: { right: 13, bottom: 54, width: 17, height: 9 },
  blossom: { position: 'absolute', top: 2, alignSelf: 'center', width: 24, height: 24 },
  petal: { position: 'absolute', width: 10, height: 10, borderRadius: 6, backgroundColor: '#D987A7' },
  petalTop: { top: 0, left: 7 },
  petalRight: { top: 7, right: 0 },
  petalBottom: { bottom: 0, left: 7 },
  petalLeft: { top: 7, left: 0 },
  flowerCenter: { position: 'absolute', top: 8, left: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F3C96F' },
  potRim: { position: 'absolute', bottom: 21, width: 39, height: 6, borderRadius: 3, backgroundColor: '#D58B63', borderWidth: 1, borderColor: 'rgba(255,242,221,0.65)' },
  pot: { position: 'absolute', bottom: 2, width: 32, height: 21, borderBottomLeftRadius: 9, borderBottomRightRadius: 9, backgroundColor: '#B96849', borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(255,242,221,0.5)' },
  shelf: { width: 76, height: 6, borderRadius: 3, backgroundColor: '#987052', borderWidth: 1, borderColor: 'rgba(255,238,205,0.75)', shadowColor: '#18271F', shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
  shelfBracket: { position: 'absolute', top: 4, left: 13, width: 4, height: 7, backgroundColor: '#846348', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  shelfBracketRight: { left: undefined, right: 13 },
  waterButton: { minWidth: 58, height: 28, marginTop: 4, paddingHorizontal: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(67,111,80,0.92)', borderWidth: 1, borderColor: 'rgba(255,249,235,0.8)' },
  waterText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.75 },
});
