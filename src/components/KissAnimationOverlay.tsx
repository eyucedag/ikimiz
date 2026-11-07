import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { KissRecord } from '@/src/services/kissService';
import { getCategoryColor } from '@/src/constants/categories';

const kissTone = getCategoryColor('opucuk');

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
    <View pointerEvents="auto" style={styles.overlay} accessibilityLiveRegion="polite">
      <Pressable style={StyleSheet.absoluteFill} onPress={() => {}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <View style={styles.content}>
        <Text style={[styles.sparkleLeft, { color: kissTone.color }]}>❤</Text>
        <Animated.Text style={[styles.lips, { opacity, transform: [{ scale }, { rotate: '-12deg' }] }]}>💋</Animated.Text>
        <Text style={[styles.sparkleRight, { color: kissTone.color }]}>❤</Text>
        <Text style={[styles.message, { color: kissTone.color }]}>{event.senderName ?? 'Partnerin'} sana bir öpücük gönderdi.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, zIndex: 1000, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 230, 235, 0.92)' },
  content: { alignItems: 'center', justifyContent: 'center' },
  lips: { fontSize: 122, textShadowColor: 'rgba(223, 25, 82, 0.25)', textShadowOffset: { width: 0, height: 8 }, textShadowRadius: 18 },
  sparkleLeft: { position: 'absolute', left: -72, top: 2, fontSize: 30, transform: [{ rotate: '-20deg' }] },
  sparkleRight: { position: 'absolute', right: -68, top: 20, fontSize: 23, transform: [{ rotate: '18deg' }] },
  message: { marginTop: 14, fontSize: 20, fontWeight: '700' },
});
