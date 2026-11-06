import React, { useEffect, useRef, useState } from 'react';
import { Animated, AppState, AppStateStatus, Image, StyleSheet, useWindowDimensions, View } from 'react-native';
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
  morning: require('../../assets/aurora/sky/sky_sabah.png'),
  day: require('../../assets/aurora/sky/sky_gunduz.png'),
  sunset: require('../../assets/aurora/sky/sky_aksamustu.png'),
  evening: require('../../assets/aurora/sky/sky_aksam.png'),
  night: require('../../assets/aurora/sky/sky_gece.png'),
};
const forestOverlay = require('../../assets/aurora/sky/forest_overlay.png');

interface DynamicSkyProps { children: React.ReactNode; compact?: boolean; treeContent?: React.ReactNode }

export function DynamicSky({ children, compact = false, treeContent }: DynamicSkyProps) {
  const { width: windowWidth } = useWindowDimensions();
  const sceneWidth = Math.min(620, Math.max(260, windowWidth - 36));
  const skyHeight = compact
    ? Math.min(210, Math.max(150, sceneWidth * 0.38))
    : Math.min(350, Math.max(228, sceneWidth / 1.58 + 4));
  const [phase, setPhase] = useState<SkyPhase>(() => getSkyPhase(new Date()));
  const [transitionFrom, setTransitionFrom] = useState<SkyPhase | null>(null);
  const transitionOpacity = useRef(new Animated.Value(0)).current;
  const previousPhase = useRef(phase);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refreshAndSchedule = () => {
      const now = new Date();
      setPhase(getSkyPhase(now));
      const nextBoundary = new Date(now);
      const nextHour = [6, 10, 17, 19, 22].find((hour) => hour > now.getHours());
      if (nextHour === undefined) nextBoundary.setDate(nextBoundary.getDate() + 1);
      nextBoundary.setHours(nextHour ?? 6, 0, 0, 0);
      // Recheck periodically as well, so clock or time-zone changes apply without a restart.
      const untilBoundary = nextBoundary.getTime() - Date.now() + 50;
      timer = setTimeout(refreshAndSchedule, Math.max(50, Math.min(untilBoundary, 60_000)));
    };
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        clearTimeout(timer);
        refreshAndSchedule();
      }
    });
    refreshAndSchedule();
    return () => { clearTimeout(timer); subscription.remove(); };
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
    <View style={[styles.container, { height: skyHeight }, compact && styles.compactContainer]}>
      <Image source={skyImages[phase]} resizeMode="cover" style={styles.image} accessibilityIgnoresInvertColors />
      {transitionFrom ? <Animated.Image pointerEvents="none" source={skyImages[transitionFrom]} resizeMode="cover" style={[styles.image, { opacity: transitionOpacity }]} /> : null}
      <View pointerEvents="none" style={styles.readabilityScrim} />
      <Image pointerEvents="none" source={forestOverlay} resizeMode="cover" style={[styles.image, styles.forestOverlay]} accessibilityIgnoresInvertColors />
      <View style={[styles.content, compact && styles.compactContent]}>{children}</View>
      {treeContent ? <View style={styles.treeContent}>{treeContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', maxWidth: 620, alignSelf: 'center', borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-start', marginBottom: 18, backgroundColor: colors.background },
  compactContainer: { marginBottom: spacing.lg },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  readabilityScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32, 35, 33, 0.08)' },
  forestOverlay: { opacity: 0.82 },
  content: { width: '100%', zIndex: 1, padding: 14, paddingBottom: 8 },
  compactContent: { padding: 14, paddingBottom: 24 },
  treeContent: { position: 'absolute', zIndex: 2, left: 14, right: 14, bottom: 8 },
});
