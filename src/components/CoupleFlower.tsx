import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
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
  const lushOpacity = animatedHealth.interpolate({ inputRange: [0, 42, 100], outputRange: [0, 0.42, 1] });

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
        <Image source={require('../../assets/aurora/illustrations/couple-flower-dry.png')} resizeMode="contain" style={styles.plantImage} accessibilityIgnoresInvertColors />
        <Animated.Image source={require('../../assets/aurora/illustrations/couple-flower-lush.png')} resizeMode="contain" style={[styles.plantImage, { opacity: lushOpacity }]} accessibilityIgnoresInvertColors />
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
  plantArea: { width: '86%', height: 140, position: 'relative', alignItems: 'center' },
  plantImage: { position: 'absolute', width: '100%', height: '100%' },
  waterButton: { minWidth: 58, height: 28, marginTop: 2, paddingHorizontal: 9, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: colors.copper, borderWidth: 1, borderColor: 'rgba(255,249,235,0.8)' },
  waterText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.75 },
});
