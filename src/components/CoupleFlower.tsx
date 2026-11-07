import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors } from '@/src/constants/theme';
import { coupleFlowerService, CoupleFlowerState, CouplePlantType, flowerHealthNow } from '@/src/services/coupleFlowerService';
import { notificationService } from '@/src/services/notificationService';
import { supabase } from '@/src/lib/supabase';

export function CoupleFlower({ coupleId, partnerId }: { coupleId: string; partnerId?: string }) {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const tablet = Math.min(windowWidth, windowHeight) >= 600;
  const landscapeTablet = tablet && windowWidth > windowHeight;
  const artworkWidth = landscapeTablet ? 154 : tablet ? 128 : Math.min(110, Math.max(76, windowWidth * 0.27));
  const artworkHeight = artworkWidth * 4 / 3;
  const booksHeight = artworkHeight * 392 / (512 * 4 / 3);
  const plantAreaHeight = artworkHeight + 40;
  const [flower, setFlower] = useState<CoupleFlowerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [watering, setWatering] = useState(false);
  const [plantMenuMode, setPlantMenuMode] = useState<'actions' | 'picker' | null>(null);
  const [changingPlant, setChangingPlant] = useState(false);
  const [wateringAnimationVisible, setWateringAnimationVisible] = useState(false);
  const [now, setNow] = useState(Date.now());
  const health = flower ? flowerHealthNow(flower, now) : 72;
  const animatedHealth = useRef(new Animated.Value(health)).current;
  const wateringProgress = useRef(new Animated.Value(0)).current;
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
      setFlower({ ...next, plantType: flower?.plantType ?? 'hanging' });
      setNow(Date.now());
    } catch (error) {
      Alert.alert('Çiçek sulanamadı', error instanceof Error ? error.message : 'Bağlantınızı kontrol edip yeniden deneyin.');
    } finally {
      setWatering(false);
    }
  };

  const waterFromPlant = () => {
    if (loading || watering || wateringAnimationVisible) return;
    setWateringAnimationVisible(true);
    wateringProgress.setValue(0);
    Animated.timing(wateringProgress, { toValue: 1, duration: 1400, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setWateringAnimationVisible(false);
    });
    void water();
  };

  const status = health < 20 ? 'Susadı' : health < 55 ? 'Biraz kuruyor' : 'Birlikte büyüyor';
  const plantType = flower?.plantType ?? 'hanging';
  const shelvedPlantClipHeight = artworkHeight * (plantType === 'cactus' ? 0.56 : 0.53);
  const plantAssets: Record<CouplePlantType, { dry: number; lush: number; label: string }> = {
    hanging: { dry: require('../../assets/aurora/illustrations/couple-flower-dry.png'), lush: require('../../assets/aurora/illustrations/couple-flower-lush.png'), label: 'Kalp kalbe karşı' },
    cactus: { dry: require('../../assets/aurora/illustrations/couple-cactus-shelves-dry.png'), lush: require('../../assets/aurora/illustrations/couple-cactus-shelves.png'), label: 'Kaktüs' },
    violet: { dry: require('../../assets/aurora/illustrations/couple-violet-shelves-dry.png'), lush: require('../../assets/aurora/illustrations/couple-violet-shelves.png'), label: 'Menekşe' },
  };
  const booksSource = require('../../assets/aurora/illustrations/couple-flower-books-shelf.png');
  const choosePlant = async (nextType: CouplePlantType) => {
    if (changingPlant || nextType === plantType) { setPlantMenuMode(null); return; }
    setChangingPlant(true);
    try {
      setFlower(await coupleFlowerService.setPlant(coupleId, nextType));
      setNow(Date.now());
      setPlantMenuMode(null);
      if (partnerId) void notificationService.notifyPartner({ partnerId, coupleId, title: 'Ortak bitki değiştirildi', body: `Birlikte büyüttüğünüz bitki ${plantAssets[nextType].label.toLocaleLowerCase('tr-TR')} olarak değiştirildi.` });
    } catch (error) {
      Alert.alert('Bitki değiştirilemedi', error instanceof Error ? error.message : 'Bağlantınızı kontrol edip yeniden deneyin.');
    } finally { setChangingPlant(false); }
  };

  return (
    <View style={styles.root}>
      <Pressable onPress={() => setPlantMenuMode('actions')} accessibilityRole="button" accessibilityLabel={`Bitki seçili: ${plantAssets[plantType].label}. İşlemleri aç.`} style={styles.statusButton}>
        <Text style={styles.status}>{status}</Text><Feather name="edit-2" size={9} color={colors.textSecondary} />
      </Pressable>
      <View style={[styles.plantArea, { height: plantAreaHeight }]}>
        <Image source={booksSource} resizeMode="contain" style={[styles.lowerBooks, { height: booksHeight }]} accessibilityIgnoresInvertColors />
        {plantType === 'hanging' ? (
          <View style={[styles.hangingPlantClip, { height: artworkHeight * 0.98 }]} pointerEvents="none">
            <Image source={plantAssets[plantType].dry} resizeMode="contain" style={[styles.plantImage, { top: 6, height: artworkHeight }]} accessibilityIgnoresInvertColors />
            <Animated.Image source={plantAssets[plantType].lush} resizeMode="contain" style={[styles.plantImage, { top: 6, height: artworkHeight, opacity: lushOpacity }]} accessibilityIgnoresInvertColors />
          </View>
        ) : (
          <View style={[styles.shelvedPlantClip, { top: 8, height: shelvedPlantClipHeight }]} pointerEvents="none">
            <Image source={plantAssets[plantType].dry} resizeMode="contain" style={[styles.shelvedPlantImage, { height: artworkHeight }]} accessibilityIgnoresInvertColors />
            <Animated.Image source={plantAssets[plantType].lush} resizeMode="contain" style={[styles.shelvedPlantImage, { height: artworkHeight, opacity: lushOpacity }]} accessibilityIgnoresInvertColors />
          </View>
        )}
        <Pressable onPress={() => setPlantMenuMode('actions')} disabled={loading || watering || wateringAnimationVisible} accessibilityRole="button" accessibilityLabel="Bitki işlemlerini aç" style={[styles.plantWaterTap, { height: artworkHeight * (plantType === 'hanging' ? 0.96 : 0.56), top: plantType === 'hanging' ? 0 : 8 }]} />
        {wateringAnimationVisible ? (
          <Animated.View pointerEvents="none" style={[styles.wateringCan, { top: artworkHeight * 0.17, transform: [{ translateY: wateringProgress.interpolate({ inputRange: [0, 0.25, 0.8, 1], outputRange: [5, -3, -3, 5] }) }, { rotate: wateringProgress.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: ['0deg', '-22deg', '-22deg', '0deg'] }) }, { scaleX: -1 }] }]}>
            <MaterialCommunityIcons name="watering-can" size={30} color={colors.copper} />
            <Animated.View style={[styles.waterDrop, { opacity: wateringProgress.interpolate({ inputRange: [0, 0.18, 0.78, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: wateringProgress.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, -6, -19, -21] }) }, { translateY: wateringProgress.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [-2, 0, 8, 10] }) }] }]} />
            <Animated.View style={[styles.waterDrop, styles.waterDropSecond, { opacity: wateringProgress.interpolate({ inputRange: [0, 0.28, 0.78, 1], outputRange: [0, 1, 1, 0] }), transform: [{ translateX: wateringProgress.interpolate({ inputRange: [0, 0.25, 0.8, 1], outputRange: [0, -4, -15, -17] }) }, { translateY: wateringProgress.interpolate({ inputRange: [0, 0.25, 0.8, 1], outputRange: [-2, 0, 10, 12] }) }] }]} />
          </Animated.View>
        ) : null}
        <Pressable onPress={() => router.push('/books')} accessibilityRole="button" accessibilityLabel="Okuyacağımız kitaplar listesini aç" style={plantType === 'hanging' ? styles.lowerBooksTap : styles.shelfBooksTap} />
      </View>
      <Modal visible={plantMenuMode !== null} transparent animationType="fade" onRequestClose={() => setPlantMenuMode(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable onPress={() => setPlantMenuMode(null)} style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Bitki menüsünü kapat" />
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}><View><Text style={styles.pickerTitle}>{plantMenuMode === 'actions' ? 'Bitki' : 'Ortak bitkinizi seçin'}</Text><Text style={styles.pickerSubtitle}>{plantMenuMode === 'actions' ? 'Ne yapmak istersiniz?' : 'Seçiminiz ikiniz için de güncellenir.'}</Text></View><Pressable onPress={() => setPlantMenuMode(null)} accessibilityRole="button" accessibilityLabel="Kapat"><Feather name="x" size={21} color={colors.text} /></Pressable></View>
            {plantMenuMode === 'actions' ? (
              <View style={styles.actionList}>
                <Pressable onPress={() => { setPlantMenuMode(null); waterFromPlant(); }} disabled={loading || watering} accessibilityRole="button" style={styles.menuAction}><Feather name="droplet" size={19} color={colors.copper} /><Text style={styles.menuActionText}>Sula</Text></Pressable>
                <Pressable onPress={() => setPlantMenuMode('picker')} accessibilityRole="button" style={styles.menuAction}><Feather name="refresh-cw" size={18} color={colors.copper} /><Text style={styles.menuActionText}>Bitki seç</Text></Pressable>
              </View>
            ) : (
              <View style={styles.optionList}>
                {(['hanging', 'violet', 'cactus'] as CouplePlantType[]).map((option) => <Pressable key={option} onPress={() => { void choosePlant(option); }} disabled={changingPlant} accessibilityRole="button" accessibilityState={{ selected: plantType === option }} style={[styles.plantOption, plantType === option && styles.plantOptionSelected]}>
                  <Text style={[styles.optionLabel, plantType === option && styles.optionLabelSelected]}>{plantAssets[option].label}</Text>
                  {plantType === option ? <Feather name="check-circle" size={17} color={colors.copper} /> : null}
                </Pressable>)}
              </View>
            )}
            {changingPlant ? <ActivityIndicator color={colors.copper} style={styles.pickerLoading} /> : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  statusButton: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 3 },
  status: { color: colors.textSecondary, fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'center' },
  plantArea: { width: '100%', position: 'relative', alignItems: 'center' },
  hangingPlantClip: { position: 'absolute', top: 0, width: '100%', overflow: 'hidden' },
  plantImage: { position: 'absolute', top: 0, width: '100%' },
  shelvedPlantClip: { position: 'absolute', top: 0, width: '100%', overflow: 'hidden' },
  shelvedPlantImage: { position: 'absolute', top: 0, width: '100%' },
  plantWaterTap: { position: 'absolute', left: 0, right: 0, zIndex: 2 },
  wateringCan: { position: 'absolute', right: '4%', zIndex: 3, alignItems: 'center' },
  waterDrop: { position: 'absolute', top: 23, left: 0, width: 5, height: 8, borderRadius: 4, backgroundColor: '#77BDE5' },
  waterDropSecond: { left: 8, top: 27 },
  lowerBooksTap: { position: 'absolute', width: '100%', height: 58, bottom: -2, zIndex: 3 },
  lowerBooks: { position: 'absolute', width: '100%', bottom: 0 },
  shelfBooksTap: { position: 'absolute', right: 0, bottom: 0, width: '100%', height: '44%', zIndex: 3 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.75 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: 'rgba(20,24,22,0.52)' },
  pickerSheet: { width: '100%', maxWidth: 430, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  pickerTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  pickerSubtitle: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  plantOption: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  plantOptionSelected: { borderColor: colors.copper, backgroundColor: '#F6E9D7' },
  actionList: { gap: 9 },
  menuAction: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  menuActionText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  optionList: { gap: 8 },
  optionLabel: { color: colors.textSecondary, fontSize: 15, fontWeight: '600', textAlign: 'left' },
  optionLabelSelected: { color: colors.copper },
  pickerLoading: { marginTop: 12 },
});
