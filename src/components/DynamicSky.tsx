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

// These are direct crops of the five landscape illustrations in the user's Aurora Forest reference.
const skyImages: Record<SkyPhase, number> = {
  morning: require('../../assets/images/aurora/aurora-morning.png'),
  day: require('../../assets/images/aurora/aurora-day.png'),
  sunset: require('../../assets/images/aurora/aurora-sunset.png'),
  evening: require('../../assets/images/aurora/aurora-evening.png'),
  night: require('../../assets/images/aurora/aurora-night.png'),
};

interface DynamicSkyProps { children: React.ReactNode; compact?: boolean }

export function DynamicSky({ children, compact = false }: DynamicSkyProps) {
  const [phase, setPhase] = useState<SkyPhase>(() => getSkyPhase(new Date()));
  const [transitionFrom, setTransitionFrom] = useState<SkyPhase | null>(null);
  const transitionOpacity = useRef(new Animated.Value(0)).current;
  const previousPhase = useRef(phase);

  useEffect(() => {
    const refreshPhase = () => setPhase(getSkyPhase(new Date()));
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
      <Image source={skyImages[phase]} resizeMode="cover" style={styles.image} accessibilityIgnoresInvertColors />
      {transitionFrom ? <Animated.Image pointerEvents="none" source={skyImages[transitionFrom]} resizeMode="cover" style={[styles.image, { opacity: transitionOpacity }]} /> : null}
      <View style={[styles.content, compact && styles.compactContent]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 620, minHeight: 190, aspectRatio: 1.95, alignSelf: 'center', borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-start', marginBottom: 18, backgroundColor: colors.background },
  compactContainer: { minHeight: 142, aspectRatio: 2.2, marginBottom: spacing.lg },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  content: { zIndex: 1, padding: 18, paddingBottom: 34 },
  compactContent: { padding: 14, paddingBottom: 42 },
});
