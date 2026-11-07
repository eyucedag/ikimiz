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
    <View style={styles.root}>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.plantArea}>
        <View style={styles.potRim} />
        <View style={styles.pot} />
        <View style={styles.shelf} />
        <View style={styles.shelfBracket} />
        <View style={styles.shelfBracketRight} />
        <View style={[styles.vine, styles.vineLeft]} />
        <View style={[styles.vine, styles.vineCenter]} />
        <View style={[styles.vine, styles.vineRight]} />
        <Animated.Text style={[styles.heartLeaf, styles.leaf1, { color: leafColor, opacity: flowerOpacity }]}>♥</Animated.Text>
        <Animated.Text style={[styles.heartLeaf, styles.leaf2, { color: leafColor, opacity: flowerOpacity }]}>♥</Animated.Text>
        <Animated.Text style={[styles.heartLeaf, styles.leaf3, { color: leafColor, opacity: flowerOpacity }]}>♥</Animated.Text>
        <Animated.Text style={[styles.heartLeaf, styles.leaf4, { color: leafColor, opacity: flowerOpacity }]}>♥</Animated.Text>
        <Animated.Text style={[styles.heartLeaf, styles.leaf5, { color: leafColor, opacity: flowerOpacity }]}>♥</Animated.Text>
        <Animated.Text style={[styles.heartLeaf, styles.leaf6, { color: leafColor, opacity: flowerOpacity }]}>♥</Animated.Text>
      </View>
      <Pressable onPress={() => { void water(); }} disabled={loading || watering} accessibilityRole="button" accessibilityLabel="Ortak çiçeği sula" style={({ pressed }) => [styles.waterButton, pressed && styles.pressed, (loading || watering) && styles.disabled]}>
        {loading || watering ? <ActivityIndicator size="small" color={colors.white} /> : <><Feather name="droplet" size={13} color={colors.white} /><Text style={styles.waterText}>Sula</Text></>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  status: { color: colors.textSecondary, fontSize: 9, lineHeight: 12, fontWeight: '700', marginBottom: 3, textAlign: 'center' },
  plantArea: { width: '100%', height: 148, alignItems: 'center', position: 'relative' },
  potRim: { position: 'absolute', top: 25, width: 35, height: 6, borderRadius: 3, backgroundColor: '#D58B63', borderWidth: 1, borderColor: '#EBD2B6', zIndex: 4 },
  pot: { position: 'absolute', top: 8, width: 29, height: 19, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: '#B96849', borderWidth: 1, borderTopWidth: 0, borderColor: '#EBD2B6', zIndex: 4 },
  shelf: { position: 'absolute', top: 35, width: '94%', height: 6, borderRadius: 3, backgroundColor: '#987052', borderWidth: 1, borderColor: 'rgba(255,238,205,0.85)', shadowColor: '#18271F', shadowOpacity: 0.26, shadowRadius: 3, elevation: 3, zIndex: 3 },
  shelfBracket: { position: 'absolute', top: 40, left: '20%', width: 4, height: 9, backgroundColor: '#846348', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, zIndex: 2 },
  shelfBracketRight: { position: 'absolute', top: 40, right: '20%', width: 4, height: 9, backgroundColor: '#846348', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, zIndex: 2 },
  vine: { position: 'absolute', top: 39, width: 2, height: 82, borderRadius: 1, backgroundColor: '#65834E', opacity: 0.9 },
  vineLeft: { left: '31%', transform: [{ rotate: '8deg' }] },
  vineCenter: { left: '50%', height: 100 },
  vineRight: { right: '29%', transform: [{ rotate: '-8deg' }] },
  heartLeaf: { position: 'absolute', fontSize: 17, lineHeight: 21, fontWeight: '700', textShadowColor: 'rgba(20,55,38,0.2)', textShadowRadius: 2 },
  leaf1: { left: '19%', top: 58, transform: [{ rotate: '-24deg' }] },
  leaf2: { left: '42%', top: 68, transform: [{ rotate: '20deg' }] },
  leaf3: { right: '18%', top: 82, transform: [{ rotate: '18deg' }] },
  leaf4: { left: '22%', top: 99, transform: [{ rotate: '18deg' }] },
  leaf5: { left: '46%', top: 114, transform: [{ rotate: '-18deg' }] },
  leaf6: { right: '22%', top: 119, transform: [{ rotate: '-18deg' }] },
  waterButton: { minWidth: 58, height: 28, marginTop: 2, paddingHorizontal: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.copper, borderWidth: 1, borderColor: 'rgba(255,249,235,0.8)' },
  waterText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.75 },
});
