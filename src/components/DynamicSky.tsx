import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, AppStateStatus, Image, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/src/constants/theme';

export type SkyPhase = 'morning' | 'day' | 'sunset' | 'evening' | 'night';

export function getSkyPhase(date: Date): SkyPhase {
  const hour = date.getHours();
  if (hour >= 6 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'sunset';
  if (hour >= 19 && hour < 22) return 'evening';
  return 'night';
}

const skyImages: Record<SkyPhase, number> = {
  morning: require('../../assets/images/aurora/aurora-morning.jpg'),
  day: require('../../assets/images/aurora/aurora-day.jpg'),
  sunset: require('../../assets/images/aurora/aurora-sunset.jpg'),
  evening: require('../../assets/images/aurora/aurora-evening.jpg'),
  night: require('../../assets/images/aurora/aurora-night.jpg'),
};

interface DynamicSkyProps { children: React.ReactNode; compact?: boolean }

function Pine({ left, height, shade }: { left: number | `${number}%`; height: number; shade: string }) {
  return (
    <View pointerEvents="none" style={[styles.pine, { left, height }]}>
      <View style={[styles.pineUpper, { borderBottomColor: shade, borderLeftWidth: height * 0.23, borderRightWidth: height * 0.23, borderBottomWidth: height * 0.48 }]} />
      <View style={[styles.pineLower, { borderBottomColor: shade, borderLeftWidth: height * 0.32, borderRightWidth: height * 0.32, borderBottomWidth: height * 0.58 }]} />
      <View style={[styles.pineTrunk, { backgroundColor: shade }]} />
    </View>
  );
}

export function DynamicSky({ children, compact = false }: DynamicSkyProps) {
  const [phase, setPhase] = useState<SkyPhase>(() => getSkyPhase(new Date()));
  const [transitionFrom, setTransitionFrom] = useState<SkyPhase | null>(null);
  const transitionOpacity = useRef(new Animated.Value(0)).current;
  const previousPhase = useRef(phase);
  useEffect(() => {
    const refreshPhase = () => {
      const next = getSkyPhase(new Date());
      setPhase(next);
    };
    const interval = setInterval(refreshPhase, 30_000);
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => { if (state === 'active') refreshPhase(); });
    refreshPhase();
    return () => { clearInterval(interval); subscription.remove(); };
  }, []);

  useEffect(() => {
    if (previousPhase.current === phase) return;
    const oldPhase = previousPhase.current;
    previousPhase.current = phase;
    setTransitionFrom(oldPhase);
    transitionOpacity.setValue(0.42);
    Animated.timing(transitionOpacity, { toValue: 0, duration: 900, useNativeDriver: true }).start(() => setTransitionFrom(null));
  }, [phase, transitionOpacity]);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Image source={skyImages[phase]} resizeMode="cover" style={styles.absoluteFill} accessibilityIgnoresInvertColors />
      {transitionFrom ? <Animated.Image pointerEvents="none" source={skyImages[transitionFrom]} resizeMode="cover" style={[styles.absoluteFill, { opacity: transitionOpacity }]} /> : null}
      <View pointerEvents="none" style={styles.readabilityTint} />
      <View pointerEvents="none" style={styles.foreground} />
      <Pine left={-6} height={80} shade={colors.background} />
      <Pine left={30} height={51} shade={colors.forest} />
      <Pine left={72} height={63} shade={colors.background} />
      <Pine left="6%" height={45} shade={colors.forest} />
      <Pine left="76%" height={48} shade={colors.forest} />
      <Pine left="88%" height={66} shade={colors.background} />
      <Pine left="96%" height={51} shade={colors.forest} />
      <View style={[styles.content, compact && styles.compactContent]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 214, aspectRatio: 1.8, maxWidth: 620, alignSelf: 'center', width: '100%', borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-start', marginBottom: 18, backgroundColor: '#183B37' },
  compactContainer: { minHeight: 142, aspectRatio: 2.2, marginBottom: spacing.lg },
  absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  readabilityTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8,45,37,0.16)' },
  foreground: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, backgroundColor: 'rgba(8,45,37,0.6)' },
  pine: { position: 'absolute', bottom: 0, width: 0, justifyContent: 'flex-end', zIndex: 2 },
  pineUpper: { position: 'absolute', bottom: 28, left: 0, width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  pineLower: { position: 'absolute', bottom: 3, left: -7, width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  pineTrunk: { position: 'absolute', bottom: 0, left: -2, width: 4, height: 13 },
  content: { zIndex: 3, padding: 18, paddingBottom: 50 },
  compactContent: { padding: 14, paddingBottom: 42 },
});
