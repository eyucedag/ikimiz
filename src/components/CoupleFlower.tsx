import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
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

  const heart = (position: StyleProp<ViewStyle>, key: string) => (
    <View key={key} style={[styles.heartLeaf, position]}>
      <Animated.View style={[styles.heartDiamond, { backgroundColor: leafColor, opacity: flowerOpacity }]} />
      <Animated.View style={[styles.heartLobe, styles.heartLobeLeft, { backgroundColor: leafColor, opacity: flowerOpacity }]} />
      <Animated.View style={[styles.heartLobe, styles.heartLobeRight, { backgroundColor: leafColor, opacity: flowerOpacity }]} />
    </View>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.status}>{status}</Text>
      <View style={styles.plantArea}>
        {/* Stems begin inside the pot, then bend as they fall over the shelf. */}
        <View style={[styles.vine, styles.vineLeftUpper]} />
        <View style={[styles.vine, styles.vineLeftMiddle]} />
        <View style={[styles.vine, styles.vineLeftLower]} />
        <View style={[styles.vine, styles.vineCenterUpper]} />
        <View style={[styles.vine, styles.vineCenterLower]} />
        <View style={[styles.vine, styles.vineRightUpper]} />
        <View style={[styles.vine, styles.vineRightMiddle]} />
        <View style={[styles.vine, styles.vineRightLower]} />
        <View style={styles.pot} />
        <View style={styles.potSoil} />
        <View style={styles.potRim} />
        <View style={styles.shelf} />
        <View style={styles.shelfBracket} />
        <View style={styles.shelfBracketRight} />
        <View style={[styles.shoot, styles.shootLeft]} />
        <View style={[styles.shoot, styles.shootCenter]} />
        <View style={[styles.shoot, styles.shootRight]} />
        {heart(styles.leaf1, 'leaf1')}{heart(styles.leaf2, 'leaf2')}{heart(styles.leaf3, 'leaf3')}
        {heart(styles.leaf4, 'leaf4')}{heart(styles.leaf5, 'leaf5')}{heart(styles.leaf6, 'leaf6')}
        {heart(styles.leaf7, 'leaf7')}{heart(styles.leaf8, 'leaf8')}
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
  plantArea: { width: '100%', height: 170, alignItems: 'center', position: 'relative' },
  pot: { position: 'absolute', top: 5, width: 38, height: 25, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#B96849', borderWidth: 1, borderTopWidth: 0, borderColor: '#EBD2B6', zIndex: 4 },
  potSoil: { position: 'absolute', top: 4, width: 34, height: 5, borderRadius: 3, backgroundColor: '#574236', zIndex: 5 },
  potRim: { position: 'absolute', top: 25, width: 46, height: 7, borderRadius: 4, backgroundColor: '#D58B63', borderWidth: 1, borderColor: '#EBD2B6', zIndex: 5 },
  shelf: { position: 'absolute', top: 32, width: '96%', height: 7, borderRadius: 3, backgroundColor: '#987052', borderWidth: 1, borderColor: 'rgba(255,238,205,0.9)', shadowColor: '#18271F', shadowOpacity: 0.26, shadowRadius: 3, elevation: 3, zIndex: 3 },
  shelfBracket: { position: 'absolute', top: 38, left: '19%', width: 5, height: 9, backgroundColor: '#846348', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, zIndex: 2 },
  shelfBracketRight: { position: 'absolute', top: 38, right: '19%', width: 5, height: 9, backgroundColor: '#846348', borderBottomLeftRadius: 2, borderBottomRightRadius: 2, zIndex: 2 },
  vine: { position: 'absolute', width: 2, borderRadius: 1, backgroundColor: '#65834E', opacity: 0.92 },
  vineLeftUpper: { top: 4, left: '32%', height: 61, transform: [{ rotate: '-8deg' }] },
  vineLeftMiddle: { top: 57, left: '34%', height: 54, transform: [{ rotate: '17deg' }] },
  vineLeftLower: { top: 102, left: '31%', height: 54, transform: [{ rotate: '-15deg' }] },
  vineCenterUpper: { top: 3, left: '49%', height: 71, transform: [{ rotate: '-4deg' }] },
  vineCenterLower: { top: 65, left: '51%', height: 92, transform: [{ rotate: '5deg' }] },
  vineRightUpper: { top: 5, right: '31%', height: 63, transform: [{ rotate: '10deg' }] },
  vineRightMiddle: { top: 60, right: '29%', height: 53, transform: [{ rotate: '-15deg' }] },
  vineRightLower: { top: 105, right: '27%', height: 49, transform: [{ rotate: '12deg' }] },
  shoot: { position: 'absolute', top: -3, width: 2, height: 12, borderRadius: 1, backgroundColor: '#65834E', zIndex: 6 },
  shootLeft: { left: '37%', transform: [{ rotate: '-15deg' }] },
  shootCenter: { left: '50%', height: 15 },
  shootRight: { right: '37%', transform: [{ rotate: '15deg' }] },
  heartLeaf: { position: 'absolute', width: 22, height: 22 },
  heartDiamond: { position: 'absolute', top: 7, left: 6, width: 11, height: 11, borderRadius: 1, transform: [{ rotate: '45deg' }] },
  heartLobe: { position: 'absolute', top: 4, width: 11, height: 11, borderRadius: 6 },
  heartLobeLeft: { left: 1 },
  heartLobeRight: { right: 1 },
  leaf1: { left: '15%', top: 51, transform: [{ rotate: '-22deg' }] },
  leaf2: { left: '43%', top: 61, transform: [{ rotate: '18deg' }] },
  leaf3: { right: '11%', top: 70, transform: [{ rotate: '20deg' }] },
  leaf4: { left: '24%', top: 85, transform: [{ rotate: '20deg' }] },
  leaf5: { right: '31%', top: 94, transform: [{ rotate: '-20deg' }] },
  leaf6: { left: '14%', top: 111, transform: [{ rotate: '-18deg' }] },
  leaf7: { left: '43%', top: 127, transform: [{ rotate: '20deg' }] },
  leaf8: { right: '14%', top: 123, transform: [{ rotate: '20deg' }] },
  waterButton: { minWidth: 58, height: 28, marginTop: 2, paddingHorizontal: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.copper, borderWidth: 1, borderColor: 'rgba(255,249,235,0.8)' },
  waterText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.75 },
});
