import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, AppStateStatus, StyleSheet, View } from 'react-native';
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

const skyPalettes: Record<SkyPhase, { top: string; middle: string; horizon: string; ridge: string; sun: string }> = {
  morning: { top: '#76566E', middle: '#C98283', horizon: '#E9A37F', ridge: '#405C5A', sun: '#FFD2A1' },
  day: { top: '#5592A1', middle: '#9DC5BE', horizon: '#D4D6B2', ridge: '#537566', sun: '#FFF0B9' },
  sunset: { top: '#5F496C', middle: '#CE796E', horizon: '#F0AE6F', ridge: '#3C5650', sun: '#FFD08A' },
  evening: { top: '#292F52', middle: '#584466', horizon: '#A26776', ridge: '#263F3C', sun: '#E2B1A2' },
  night: { top: '#071A31', middle: '#102D42', horizon: '#29454C', ridge: '#142E2A', sun: '#F6E9D7' },
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
  const palette = skyPalettes[phase];
  const stars = useMemo(() => Array.from({ length: 19 }, (_, i) => ({
    left: `${(i * 47 + 13) % 97}%`, top: `${(i * 29 + 9) % 47}%`, size: i % 5 === 0 ? 3 : 2,
  })), []);

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

  const isNight = phase === 'night';
  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={[styles.skyBand, { top: 0, height: '44%', backgroundColor: palette.top }]} />
      <View style={[styles.skyBand, { top: '34%', height: '42%', backgroundColor: palette.middle }]} />
      <View style={[styles.skyBand, { top: '65%', height: '35%', backgroundColor: palette.horizon }]} />
      {isNight ? <>
        {stars.map((star, i) => <View key={i} pointerEvents="none" style={[styles.star, { left: star.left, top: star.top, width: star.size, height: star.size }]} />)}
        <View pointerEvents="none" style={styles.moon}><View style={[styles.moonShade, { backgroundColor: palette.top }]} /></View>
      </> : <View pointerEvents="none" style={[styles.sun, { backgroundColor: palette.sun }, phase === 'day' ? styles.daySun : null]} />}
      {phase === 'day' ? <View pointerEvents="none" style={styles.cloudOne}><View style={styles.cloudLobeA} /><View style={styles.cloudLobeB} /></View> : null}
      <View pointerEvents="none" style={[styles.mountainFar, { borderBottomColor: phase === 'night' ? '#294451' : '#718A82' }]} />
      <View pointerEvents="none" style={[styles.mountainNear, { borderBottomColor: palette.ridge }]} />
      <View pointerEvents="none" style={[styles.foreground, { backgroundColor: colors.background }]} />
      <Pine left={-6} height={80} shade={colors.background} />
      <Pine left={30} height={51} shade={colors.forest} />
      <Pine left={72} height={63} shade={colors.background} />
      <Pine left={-1} height={45} shade={colors.forest} />
      <Pine left="77%" height={55} shade={colors.forest} />
      <Pine left="90%" height={77} shade={colors.background} />
      <Pine left="96%" height={46} shade={colors.forest} />
      {transitionFrom ? <Animated.View pointerEvents="none" style={[styles.transitionVeil, { backgroundColor: skyPalettes[transitionFrom].top, opacity: transitionOpacity }]} /> : null}
      <View style={[styles.content, compact && styles.compactContent]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { minHeight: 214, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-start', marginBottom: 18, backgroundColor: '#183B37' },
  compactContainer: { minHeight: 142, marginBottom: spacing.lg },
  skyBand: { position: 'absolute', left: 0, right: 0 },
  star: { position: 'absolute', borderRadius: 2, backgroundColor: '#F6E9D7', opacity: 0.82 },
  sun: { position: 'absolute', top: 52, right: '22%', width: 35, height: 35, borderRadius: 18, shadowColor: '#FFD6A2', shadowOpacity: 0.5, shadowRadius: 18, elevation: 4 },
  daySun: { top: 34, right: '13%', width: 28, height: 28 },
  moon: { position: 'absolute', top: 28, right: '18%', width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cream, shadowColor: colors.cream, shadowOpacity: 0.38, shadowRadius: 14, elevation: 3 },
  moonShade: { position: 'absolute', top: -3, right: -4, width: 22, height: 22, borderRadius: 11 },
  cloudOne: { position: 'absolute', top: 46, right: '39%', width: 54, height: 18, borderRadius: 12, backgroundColor: 'rgba(255,248,232,0.28)' },
  cloudLobeA: { position: 'absolute', left: 10, top: -7, width: 23, height: 23, borderRadius: 12, backgroundColor: 'rgba(255,248,232,0.3)' },
  cloudLobeB: { position: 'absolute', left: 26, top: -4, width: 18, height: 18, borderRadius: 10, backgroundColor: 'rgba(255,248,232,0.27)' },
  mountainFar: { position: 'absolute', bottom: 35, left: '23%', width: 0, height: 0, borderLeftWidth: 122, borderRightWidth: 122, borderBottomWidth: 96, borderLeftColor: 'transparent', borderRightColor: 'transparent', opacity: 0.74 },
  mountainNear: { position: 'absolute', bottom: 26, left: '-19%', width: 0, height: 0, borderLeftWidth: 164, borderRightWidth: 164, borderBottomWidth: 111, borderLeftColor: 'transparent', borderRightColor: 'transparent', opacity: 0.9 },
  foreground: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 25, opacity: 0.52 },
  pine: { position: 'absolute', bottom: 0, width: 0, justifyContent: 'flex-end', zIndex: 2 },
  pineUpper: { position: 'absolute', bottom: 28, left: 0, width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  pineLower: { position: 'absolute', bottom: 3, left: -7, width: 0, height: 0, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  pineTrunk: { position: 'absolute', bottom: 0, left: -2, width: 4, height: 13 },
  transitionVeil: { ...StyleSheet.absoluteFill },
  content: { zIndex: 3, padding: 18, paddingBottom: 50 },
  compactContent: { padding: 14, paddingBottom: 42 },
});
