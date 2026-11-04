import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { KissRecord } from '@/src/services/kissService';

export function KissAnimationOverlay({ event, onFinish }: { event: KissRecord | null; onFinish: () => void }) {
  const scale = useRef(new Animated.Value(0.15)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!event) return;
    scale.setValue(0.15);
    opacity.setValue(0);
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1.2, friction: 4, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]),
      Animated.delay(1100),
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.65, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
    ]);
    animation.start(({ finished }) => { if (finished) onFinish(); });
    return () => animation.stop();
  }, [event?.id, onFinish, opacity, scale]);

  if (!event) return null;

  return (
    <View pointerEvents="none" style={styles.overlay} accessibilityLiveRegion="polite">
      <View style={styles.content}>
        <Text style={styles.sparkleLeft}>❤</Text>
        <Animated.Text style={[styles.lips, { opacity, transform: [{ scale }, { rotate: '-12deg' }] }]}>💋</Animated.Text>
        <Text style={styles.sparkleRight}>❤</Text>
        <Text style={styles.message}>Sana bir öpücük gönderdi!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 240, 246, 0.9)' },
  content: { alignItems: 'center', justifyContent: 'center' },
  lips: { fontSize: 122, textShadowColor: 'rgba(223, 25, 82, 0.25)', textShadowOffset: { width: 0, height: 8 }, textShadowRadius: 18 },
  sparkleLeft: { position: 'absolute', left: -72, top: 2, color: '#FF3D77', fontSize: 30, transform: [{ rotate: '-20deg' }] },
  sparkleRight: { position: 'absolute', right: -68, top: 20, color: '#FF3D77', fontSize: 23, transform: [{ rotate: '18deg' }] },
  message: { marginTop: 14, color: '#B51F4C', fontSize: 20, fontWeight: '700' },
});
