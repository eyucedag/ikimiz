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

interface DynamicSkyProps { children: React.ReactNode; compact?: boolean; treeContent?: React.ReactNode; sideContent?: React.ReactNode }

export function DynamicSky({ children, compact = false, treeContent, sideContent }: DynamicSkyProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tablet = Math.min(windowWidth, windowHeight) >= 600;
  const landscapeTablet = tablet && windowWidth > windowHeight;
  const sideWidth = sideContent ? (landscapeTablet ? 154 : tablet ? 128 : Math.min(110, Math.max(76, windowWidth * 0.27))) : 0;
  const maxSceneWidth = sideContent
    ? landscapeTablet ? 800 : tablet ? 570 : 500
    : landscapeTablet ? 900 : tablet ? 760 : 620;
  const sceneWidth = Math.min(maxSceneWidth, Math.max(sideContent ? 176 : 260, windowWidth - 36 - (sideContent ? sideWidth + 6 : 0)));
  const skyHeight = compact
    ? Math.min(landscapeTablet ? 300 : 240, Math.max(150, sceneWidth * (landscapeTablet ? 0.30 : 0.34)))
    : landscapeTablet
      ? Math.min(560, Math.max(320, sceneWidth * 9 / 16))
      : Math.min(tablet ? 390 : 350, Math.max(sideContent && !tablet ? 270 : 228, sceneWidth / 1.58 + 4));
  // Preserve the artwork's 16:9 ratio and frame its sun/moon in the open
  // upper-right area, away from the greeting on narrow phone layouts.
  const skyImageHeight = Math.max(skyHeight, sceneWidth * 9 / 16);
  const skyImageWidth = skyImageHeight * 16 / 9;
  const visibleFraction = Math.min(1, sceneWidth / skyImageWidth);
  const cropStart = Math.max(0, Math.min(1 - visibleFraction, 0.77 - 0.82 * visibleFraction));
  const skyImageStyle = {
    width: skyImageWidth,
    height: skyImageHeight,
    left: -skyImageWidth * cropStart,
    right: undefined,
    top: (skyHeight - skyImageHeight) / 2,
  };
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
    <View style={[styles.sceneRow, { width: Math.min(landscapeTablet ? 1140 : tablet ? 900 : 710, windowWidth - 36, sceneWidth + (sideContent ? sideWidth + 6 : 0)) }]}>
    <View style={[styles.container, { height: skyHeight, width: sideContent ? sceneWidth : '100%' }, compact && styles.compactContainer]}>
      <Image source={skyImages[phase]} resizeMode="cover" style={[styles.image, skyImageStyle]} accessibilityIgnoresInvertColors />
      {transitionFrom ? <Animated.Image pointerEvents="none" source={skyImages[transitionFrom]} resizeMode="cover" style={[styles.image, skyImageStyle, { opacity: transitionOpacity }]} /> : null}
      <View pointerEvents="none" style={styles.readabilityScrim} />
      <Image pointerEvents="none" source={forestOverlay} resizeMode="cover" style={[styles.image, skyImageStyle, styles.forestOverlay]} accessibilityIgnoresInvertColors />
      <View style={[styles.content, compact && styles.compactContent]}>{children}</View>
      {treeContent ? <View style={styles.treeContent}>{treeContent}</View> : null}
    </View>
    {sideContent ? <View style={[styles.sideContent, { height: skyHeight, width: sideWidth }]}>{sideContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sceneRow: { maxWidth: 710, alignSelf: 'center', flexDirection: 'row', alignItems: 'stretch', marginBottom: 18 },
  container: { maxWidth: 620, alignSelf: 'center', borderRadius: 22, overflow: 'hidden', justifyContent: 'flex-start', backgroundColor: colors.background },
  compactContainer: { marginBottom: spacing.lg },
  image: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  readabilityScrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32, 35, 33, 0.08)' },
  forestOverlay: { opacity: 0.82 },
  content: { width: '100%', zIndex: 1, padding: 14, paddingBottom: 8 },
  compactContent: { padding: 14, paddingBottom: 24 },
  treeContent: { position: 'absolute', zIndex: 2, left: 14, right: 14, bottom: 8 },
  sideContent: { flexShrink: 0, marginLeft: 6, justifyContent: 'center', alignItems: 'center' },
});
