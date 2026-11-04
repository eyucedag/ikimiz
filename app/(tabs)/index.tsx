import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, EmptyState, Screen, SectionHeader } from '@/src/components/ui';
import { MoodSummaryCard } from '@/src/components/MoodSummaryCard';
import { KissCategoryButton } from '@/src/components/KissCategoryButton';
import { categories, getCategoryColor, getCategoryRoute, isCategoryReady } from '@/src/constants/categories';
import { colors, fontSize, layout, radius, spacing } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks/useAppState';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { useMoods } from '@/src/hooks/useMoods';
import { supabase } from '@/src/lib/supabase';
import { greeting, relativeTime, todayLabel } from '@/src/utils/date';
import { useCoupleDirection } from '@/src/hooks/useCoupleDirection';

export default function TodayScreen() {
  const noteColor = getCategoryColor('ekrana-not');
  const calendarColor = getCategoryColor('takvim');
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const { latestFromPartner, refresh: refreshNotes } = useScreenNotes(couple);
  const moods = useMoods(couple);
  const { upcoming, refreshNotifications } = useAppState();
  const { width, height } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const direction = useCoupleDirection(couple.couple?.id, user?.id, couple.partner?.id);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const togetherDuration = useMemo(() => {
    const startedAt = couple.couple?.relationshipStartedAt;
    if (!startedAt) return null;
    const elapsed = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
    const days = Math.floor(elapsed / 86400);
    const hours = Math.floor((elapsed % 86400) / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${days} gün · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [couple.couple?.relationshipStartedAt, now]);

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = supabase.channel(`home-couple-photo-${coupleId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}`,
      }, () => { void couple.refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, couple.refresh]);

  const columns = Math.min(width, layout.maxContentWidth) >= 520 ? 4 : 2;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([couple.refresh(), refreshNotes(), moods.refresh(), refreshNotifications()]);
    } finally {
      setRefreshing(false);
    }
  };

  const changeCouplePhoto = async () => {
    if (!couple.couple) {
      Alert.alert('Önce eşleşin', 'Ortak fotoğraf eklemek için partnerinizle eşleşmeniz gerekiyor.');
      return;
    }
    setPhotoVisible(false);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 250));
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.82, exif: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
        Alert.alert('Fotoğraf çok büyük', 'Lütfen 8 MB’tan küçük bir fotoğraf seçin.');
        return;
      }
      setUploadingPhoto(true);
      const mimeType = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Seçilen fotoğraf okunamadı.');
      const file = await response.arrayBuffer();
      if (file.byteLength > 8 * 1024 * 1024) throw new Error('Fotoğraf 8 MB’tan büyük. Daha küçük bir fotoğraf seçin.');
      const photoPath = `${couple.couple.id}/photo`;
      const { error: uploadError } = await supabase.storage.from('couple-photos').upload(photoPath, file, {
        contentType: mimeType, cacheControl: '0', upsert: true,
      });
      if (uploadError) {
        if (uploadError.message.toLowerCase().includes('bucket') || uploadError.message.toLowerCase().includes('row-level security')) {
          throw new Error('Fotoğraf yükleme ayarı henüz tamamlanmadı. Supabase SQL Editor’da ortak fotoğraf kurulum SQL’ini çalıştırın.');
        }
        throw new Error(uploadError.message);
      }
      const { error: saveError } = await supabase.rpc('set_couple_photo_path', { p_path: photoPath });
      if (saveError) throw new Error('Ortak fotoğraf ayarı Supabase’e eklenmemiş olabilir. Önce ortak fotoğraf SQL kurulumunu çalıştırın.');
      await couple.refresh();
      Alert.alert('Fotoğraf güncellendi', 'Ortak fotoğrafınız ikinizin ana ekranında görünecek.');
    } catch (error) {
      Alert.alert('Fotoğraf yüklenemedi', error instanceof Error ? error.message : 'Bağlantınızı kontrol edip yeniden deneyin.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Screen inTabs refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <View style={styles.identityRow}>
          {couple.couple?.photoUrl ? (
            <Pressable onPress={() => setPhotoVisible(true)} accessibilityRole="button" accessibilityLabel="Ortak fotoğrafı görüntüle">
              <Image source={{ uri: couple.couple.photoUrl }} style={styles.couplePhoto} accessibilityLabel="İkinizin ortak fotoğrafı" />
            </Pressable>
          ) : (
            <Pressable onPress={() => setPhotoVisible(true)} accessibilityRole="button" accessibilityLabel="Ortak fotoğrafı görüntüle veya ekle" style={styles.photoPlaceholder}>
              <Feather name="users" size={23} color={colors.textSecondary} />
            </Pressable>
          )}
          <View style={styles.identityText}>
            <Text style={styles.appTitle} accessibilityRole="header">İkimiz</Text>
            <Text style={styles.subtitle}>{greeting()}, {user?.displayName} · {todayLabel()}</Text>
            {togetherDuration ? <Text style={styles.duration}>{togetherDuration}</Text> : couple.isPaired ? <Text style={styles.durationMissing}>Birlikte olduğunuz zamanı profilden ekleyin</Text> : null}
          </View>
        </View>
        {couple.isPaired ? (
          <Pressable
            onPress={() => direction.sharing ? direction.stop() : void direction.start()}
            accessibilityRole="button"
            accessibilityLabel={direction.angle == null ? 'Partner yönünü görmek için konum paylaşımını aç' : 'Partnerin yönünü göster'}
            style={[styles.directionButton, direction.sharing && styles.directionButtonActive]}
          >
            <Feather name="navigation" size={21} color={direction.sharing ? '#1676E8' : colors.textSecondary} style={direction.angle == null ? undefined : { transform: [{ rotate: `${direction.angle}deg` }] }} />
          </Pressable>
        ) : null}
      </View>
      {direction.error ? <Text style={styles.directionHint}>{direction.error}</Text> : direction.sharing ? <Text style={styles.directionHint}>Konumun yalnızca uygulama açıkken partnerinle paylaşılır.</Text> : null}

      {/* Partnerinden Not */}
      <Card style={[styles.section, styles.narrowCard, { borderColor: noteColor.color, borderWidth: 1.5 }]}>
        {couple.isPaired ? (
          <>
            <SectionHeader title="Partnerinden Not" actionLabel="Tüm Notlar" actionColor={noteColor.color} onAction={() => router.push('/screen-note/history')} />
            {latestFromPartner ? (
              <View style={[styles.note, { backgroundColor: latestFromPartner.backgroundColor }]}>
                {latestFromPartner.emoji ? <Text style={styles.noteEmoji}>{latestFromPartner.emoji}</Text> : null}
                {latestFromPartner.imageUrl ? <Image source={{ uri: latestFromPartner.imageUrl }} style={styles.noteSticker} resizeMode="contain" /> : null}
                <Text style={styles.noteText}>{latestFromPartner.text}</Text>
                <Text style={styles.noteMeta}>
                  {couple.partner?.displayName} · {relativeTime(latestFromPartner.createdAt)}
                </Text>
              </View>
            ) : (
              <Text style={styles.muted}>{couple.partner?.displayName} henüz bir not bırakmadı. İlk notu siz bırakın.</Text>
            )}
            <Button title="Yeni Not Bırak" icon="edit-3" toneColor={noteColor.color} onPress={() => router.push('/screen-note/compose')} style={styles.cardButton} />
          </>
        ) : (
          <>
            <SectionHeader title="Partnerinden Not" />
            <View style={styles.connectRow}>
              <View style={[styles.connectIcon, { backgroundColor: noteColor.tint }]}>
                <Feather name="link" size={20} color={noteColor.color} />
              </View>
              <Text style={styles.connectText}>
                {couple.pendingInvitation
                  ? `Davet kodunuz ${couple.pendingInvitation.code} partnerinizin onayını bekliyor.`
                  : 'Partnerinizle bağlandığınızda bıraktığı notlar burada görünür.'}
              </Text>
            </View>
            {couple.pendingInvitation ? (
              <Button title="Davet Durumunu Gör" variant="secondary" onPress={() => router.push('/couple/invite')} style={styles.cardButton} />
            ) : (
              <View style={styles.buttonRow}>
                <Button title="Davet Et" icon="send" onPress={() => router.push('/couple/invite')} style={styles.flex} />
                <Button title="Kodum Var" variant="secondary" onPress={() => router.push('/couple/accept')} style={styles.flex} />
              </View>
            )}
          </>
        )}
      </Card>

      <MoodSummaryCard
        today={moods.today}
        partnerToday={moods.partnerToday}
        partnerName={couple.partner?.displayName ?? 'Partneriniz'}
        paired={couple.isPaired}
        loading={moods.loading || couple.loading}
        error={moods.error}
        onPress={() => router.push('/mood')}
      />

      {/* Yaklaşanlar */}
      <Card style={[styles.section, styles.narrowCard, { borderColor: calendarColor.color, borderWidth: 1.5 }]}>
        <SectionHeader title="Yaklaşanlar" />
        {upcoming.length === 0 ? (
          <EmptyState
            compact
            icon="sun"
            title="Önünüz açık"
            description="Etkinlikler, görevler ve hatırlatmalar eklendiğinde en yakın olanlar burada sıralanacak."
            actionLabel="Takvimi Keşfet"
            onAction={() => router.push('/categories/takvim')}
            toneColor={calendarColor.color}
            toneTint={calendarColor.tint}
          />
        ) : (
          upcoming.map((item) => (
            <View key={item.id} style={styles.upcomingRow}>
              <Text style={styles.upcomingTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.subtitle}</Text>
            </View>
          ))
        )}
      </Card>

      {/* Kategoriler */}
      <SectionHeader title="Kategoriler" />
      <View style={styles.grid}>
        {categories.filter((c) => c.slug !== 'opucuk' && c.slug !== 'ekrana-not').map((c) => (
          <Pressable
            key={c.slug}
            onPress={() => router.push(getCategoryRoute(c.slug))}
            accessibilityRole="button"
            accessibilityLabel={c.title}
            style={({ pressed }) => [styles.tile, { width: `${100 / columns}%` }, pressed && styles.pressed]}
          >
            <View style={[styles.tileInner, { borderColor: c.color, borderTopColor: c.color }]}>
              <View style={[styles.tileIcon, { backgroundColor: c.tint }]}>
                <Feather name={c.icon as keyof typeof Feather.glyphMap} size={20} color={c.color} />
              </View>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {c.title}
              </Text>
              {isCategoryReady(c.slug)
                ? <Badge label="Hazır" color={c.color} backgroundColor={c.tint} />
                : <Badge label="Yakında" tone="neutral" />}
            </View>
          </Pressable>
        ))}
      </View>
      <KissCategoryButton ownerId={user?.id} partnerId={couple.partner?.id} coupleId={couple.couple?.id} />
      <Modal visible={photoVisible} transparent animationType="fade" onRequestClose={() => setPhotoVisible(false)}>
        <View style={styles.photoModalBackdrop}>
          <Pressable onPress={() => setPhotoVisible(false)} accessibilityRole="button" accessibilityLabel="Fotoğrafı kapat" style={styles.photoClose}>
            <Feather name="x" size={22} color={colors.white} />
          </Pressable>
          {couple.couple?.photoUrl ? (
            <Image source={{ uri: couple.couple.photoUrl }} style={[styles.photoModalImage, { width: width * 0.9, height: height * 0.68 }]} resizeMode="contain" accessibilityLabel="İkinizin ortak fotoğrafı" />
          ) : (
            <View style={styles.photoModalPlaceholder}><Feather name="users" size={54} color={colors.white} /><Text style={styles.photoModalHint}>Henüz ortak fotoğraf eklenmedi</Text></View>
          )}
          <Button
            title={uploadingPhoto ? 'Yükleniyor…' : couple.couple?.photoPath ? 'Fotoğrafı değiştir' : 'Fotoğraf ekle'}
            icon={uploadingPhoto ? undefined : 'image'}
            loading={uploadingPhoto}
            disabled={uploadingPhoto}
            onPress={() => { void changeCouplePhoto(); }}
            style={styles.photoChangeButton}
            toneColor="#E5163D"
          />
        </View>
      </Modal>
      {uploadingPhoto ? <View pointerEvents="none" style={styles.photoUploading}><ActivityIndicator color="#E5163D" /></View> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: spacing.sm, marginBottom: spacing.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1 },
  directionButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentLight },
  directionButtonActive: { backgroundColor: '#DFEBFF' },
  directionHint: { color: colors.textSecondary, fontSize: fontSize.xs, marginLeft: 68, marginTop: -spacing.lg, marginBottom: spacing.sm },
  couplePhoto: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderColor: colors.border },
  photoPlaceholder: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentLight, borderWidth: 1.5, borderColor: colors.border },
  photoModalBackdrop: { flex: 1, backgroundColor: 'rgba(18,15,18,0.94)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  photoClose: { position: 'absolute', top: 52, right: spacing.lg, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  photoModalImage: { maxWidth: '100%', borderRadius: radius.card },
  photoModalPlaceholder: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  photoModalHint: { marginTop: spacing.md, color: colors.white, fontSize: fontSize.md },
  photoChangeButton: { minWidth: 220, marginTop: spacing.xl },
  photoUploading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  appTitle: { fontSize: fontSize.xxxl, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.xs },
  duration: { fontSize: fontSize.sm, color: '#1676E8', fontWeight: '700', marginTop: spacing.xs, fontVariant: ['tabular-nums'] },
  durationMissing: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },
  section: { marginBottom: spacing.lg },
  narrowCard: { width: '92%', alignSelf: 'center' },
  note: { borderRadius: radius.card, padding: spacing.lg },
  noteEmoji: { fontSize: fontSize.xxl, marginBottom: spacing.xs },
  noteSticker: { width: 120, height: 120, alignSelf: 'center', marginBottom: spacing.sm },
  noteText: { fontSize: fontSize.lg, color: colors.text, lineHeight: 24 },
  noteMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm },
  muted: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  cardButton: { marginTop: spacing.lg },
  connectRow: { flexDirection: 'row', alignItems: 'center' },
  connectIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  connectText: { flex: 1, fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
  buttonRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  flex: { flex: 1 },
  upcomingRow: { paddingVertical: spacing.sm },
  upcomingTitle: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  tile: { padding: spacing.xs },
  tileInner: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderTopWidth: 3,
    borderTopColor: colors.accent,
    padding: spacing.md,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  tileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginVertical: spacing.sm },
  pressed: { opacity: 0.8 },
});
