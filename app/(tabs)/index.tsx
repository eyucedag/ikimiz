import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, EmptyState, Screen, SectionHeader } from '@/src/components/ui';
import { MoodSummaryCard } from '@/src/components/MoodSummaryCard';
import { DynamicSky } from '@/src/components/DynamicSky';
import { getCategoryColor } from '@/src/constants/categories';
import { auroraIcons } from '@/src/constants/auroraAssets';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks/useAppState';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { useScreenNotes } from '@/src/hooks/useScreenNotes';
import { useMoods } from '@/src/hooks/useMoods';
import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';
import { songOfTheDayService } from '@/src/services/songOfTheDayService';
import { greeting, relativeTime, todayLabel } from '@/src/utils/date';
import { useCoupleDirection } from '@/src/hooks/useCoupleDirection';
import { useAutomaticNearbySteps } from '@/src/hooks/useAutomaticNearbySteps';

export default function TodayScreen() {
  const noteColor = getCategoryColor('ekrana-not');
  const calendarColor = getCategoryColor('takvim');
  const songColor = getCategoryColor('gunun-sarkisi');
  const router = useRouter();
  const { user } = useAuth();
  const couple = useCouple();
  const { latestFromPartner, refresh: refreshNotes, markRead } = useScreenNotes(couple);
  const moods = useMoods(couple);
  const { upcoming, refreshNotifications } = useAppState();
  const { width, height } = useWindowDimensions();
  const [refreshing, setRefreshing] = useState(false);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [todaySong, setTodaySong] = useState<{ title: string; artist: string; url: string } | null>(null);
  const direction = useCoupleDirection(couple.couple?.id, user?.id, couple.partner?.id);
  useAutomaticNearbySteps(user?.id, couple.couple?.id, couple.partner?.id);
  const [now, setNow] = useState(Date.now());
  const songDate = useMemo(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }, []);

  const refreshTodaySong = useCallback(async () => {
    const coupleId = couple.couple?.id;
    if (!coupleId) { setTodaySong(null); return; }
    try {
      const song = await songOfTheDayService.get(coupleId, songDate);
      setTodaySong(song ? { title: song.title, artist: song.artist, url: song.url } : null);
    } catch { /* Keep the home screen usable if the song cannot be fetched. */ }
  }, [couple.couple?.id, songDate]);

  useFocusEffect(useCallback(() => { void refreshTodaySong(); }, [refreshTodaySong]));

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = supabase.channel(`home-daily-song-${coupleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_songs', filter: `couple_id=eq.${coupleId}` }, () => { void refreshTodaySong(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [couple.couple?.id, refreshTodaySong]);

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
    return `${days} gün ${hours} saat ${minutes} dakika ${seconds} saniye`;
  }, [couple.couple?.relationshipStartedAt, now]);

  useFocusEffect(useCallback(() => {
    if (latestFromPartner && !latestFromPartner.readAt) void markRead(latestFromPartner.id);
  }, [latestFromPartner?.id, latestFromPartner?.readAt, markRead]));

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

  const quickAccess = [
    { title: 'Takvim', icon: auroraIcons.calendar, route: '/calendar' },
    { title: 'Özel Günler', icon: auroraIcons.specialDates, route: '/special-dates' },
    { title: 'Gezilen Yerler', icon: auroraIcons.places, route: '/travel-map' },
    { title: 'Görevler', icon: auroraIcons.tasks, route: '/tasks' },
  ];

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([couple.refresh(), refreshNotes(), moods.refresh(), refreshNotifications(), refreshTodaySong()]);
    } finally {
      setRefreshing(false);
    }
  };

  const listenToTodaySong = async () => {
    if (!todaySong?.url) return;
    try { await Linking.openURL(todaySong.url); }
    catch { Alert.alert('Bağlantı açılamadı', 'Şarkı bağlantısını kontrol edip yeniden deneyin.'); }
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
      if (couple.partner?.id) await notificationService.notifyPartner({
        partnerId: couple.partner.id, coupleId: couple.couple.id, title: 'Ortak fotoğraf güncellendi', body: 'Partneriniz ortak fotoğrafınızı değiştirdi.',
      });
      await couple.refresh();
      Alert.alert('Fotoğraf güncellendi', 'Ortak fotoğrafınız ikinizin ana ekranında görünecek.');
    } catch (error) {
      Alert.alert('Fotoğraf yüklenemedi', error instanceof Error ? error.message : 'Bağlantınızı kontrol edip yeniden deneyin.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <Screen inTabs scroll={height < 780} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.responsiveContent}>
      <DynamicSky treeContent={couple.isPaired ? (
        <View style={styles.treeControls}>
          <Pressable
            onPress={() => direction.sharing ? direction.stop() : void direction.start()}
            accessibilityRole="button"
            accessibilityLabel={direction.angle == null ? 'Partner yönünü görmek için konum paylaşımını aç' : 'Partnerin yönünü göster'}
            style={styles.directionButton}
          >
            <Feather
              name="arrow-up"
              size={27}
              color={direction.bothSharing ? '#159447' : direction.sharing || direction.anySharing ? '#1676E8' : colors.cream}
              style={direction.bothSharing && direction.angle != null ? { transform: [{ rotate: `${direction.angle}deg` }] } : undefined}
            />
            <Text style={styles.directionLabel}>Aşkım nerdesin?</Text>
          </Pressable>
          <Text style={styles.directionHintOverlay} numberOfLines={1}>
            {direction.error || (direction.bothSharing ? 'İkinizin konumu açık.' : direction.sharing ? 'Konumunuz açık; partneriniz de açınca yönü göreceksiniz.' : direction.anySharing ? 'Partnerinizin konumu açık; yön için siz de açın.' : ' ')}
          </Text>
          <MoodSummaryCard
            today={moods.today}
            partnerToday={moods.partnerToday}
            partnerName={couple.partner?.displayName ?? 'Partneriniz'}
            paired={couple.isPaired}
            loading={moods.loading || couple.loading}
            error={moods.error}
            onPress={() => router.push('/mood')}
            compact
            overlay
          />
        </View>
      ) : null}>
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
            <Text style={styles.subtitle}>{greeting(new Date(now))}, {user?.displayName}</Text>
            <Text style={styles.dateLabel}>{todayLabel(new Date(now))}</Text>
            {togetherDuration ? <View style={styles.durationPill}><Text style={styles.duration}>{togetherDuration}</Text></View> : couple.isPaired ? <Text style={styles.durationMissing}>Birlikte olduğunuz zamanı profilden ekleyin</Text> : null}
          </View>
        </View>

      </View>
      </DynamicSky>

      <Card style={[styles.section, styles.compactCard, styles.songCard, { borderColor: songColor.color, borderWidth: 1 }]}>
        <View>
          <Pressable onPress={() => router.push('/song-of-the-day')} accessibilityRole="button" accessibilityLabel="Günün Şarkısı sayfasını aç" style={styles.upcomingCompact}>
            <View style={[styles.upcomingIcon, { backgroundColor: songColor.tint }]}><Feather name="music" size={18} color={songColor.color} /></View>
            <View style={styles.upcomingCopy}>
              <Text style={styles.upcomingDescription}>Günün Şarkısı</Text>
              {todaySong ? <>
                <Text style={styles.songCardTitle} numberOfLines={1}>{todaySong.title}</Text>
                <Text style={styles.songCardArtist} numberOfLines={1}>{todaySong.artist}</Text>
              </> : <Text style={styles.upcomingTitle} numberOfLines={1}>Bugün birbirinize bir şarkı seçin.</Text>}
            </View>
            <Feather name="chevron-right" size={18} color={songColor.color} />
          </Pressable>
          {todaySong?.url ? <Button title="Şarkıyı dinle" icon="play" toneColor={songColor.color} onPress={() => { void listenToTodaySong(); }} compact style={styles.cardActionButton} /> : null}
        </View>
      </Card>

      {/* Partnerinden Not */}
      <Card style={[styles.section, styles.compactCard, styles.noteCard, { borderColor: noteColor.color, borderWidth: 1 }]}>
        {couple.loading ? (
          <View style={styles.noteHeader}><Text style={styles.noteHeaderTitle}>Partnerinden Not</Text><ActivityIndicator color={noteColor.color} /></View>
        ) : couple.isPaired ? (
          <>
            <View style={styles.noteHeader}>
              <Text style={styles.noteHeaderTitle}>Partnerinden Not</Text>
              <View style={styles.noteHeaderActions}>
                <View style={styles.allNotesAction}>
                  <Pressable onPress={() => router.push('/screen-note/history')} accessibilityRole="button" accessibilityLabel="Bütün notları gör" style={[styles.allNotesButton, { backgroundColor: noteColor.tint }]}>
                    <Feather name="list" size={15} color={noteColor.color} />
                  </Pressable>
                  <Text style={[styles.allNotesLabel, { color: noteColor.color }]}>Bütün Notlar</Text>
                </View>
              </View>
            </View>
            {latestFromPartner ? (
              <View style={[styles.note, { backgroundColor: latestFromPartner.backgroundColor }]}>
                {latestFromPartner.emoji ? <Text style={styles.noteEmoji}>{latestFromPartner.emoji}</Text> : null}
                <Text style={styles.noteText} numberOfLines={2}>{latestFromPartner.text}</Text>
                <Text style={styles.noteMeta}>
                  {couple.partner?.displayName} · {relativeTime(latestFromPartner.createdAt)}
                </Text>
              </View>
            ) : (
              <Text style={styles.muted}>{couple.partner?.displayName} henüz bir not bırakmadı.</Text>
            )}
            <Button title="Not Yaz" icon="edit-3" toneColor={noteColor.color} onPress={() => router.push('/screen-note/compose')} compact style={styles.cardActionButton} />
          </>
        ) : (
          <>
            <View style={styles.noteHeader}><Text style={styles.noteHeaderTitle}>Partnerinden Not</Text></View>
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
              <Button title="Davet Durumunu Gör" toneColor={noteColor.color} onPress={() => router.push('/couple/invite')} style={styles.cardActionButton} />
            ) : (
              <View style={styles.buttonRow}>
                <Button title="Davet Et" icon="send" toneColor={noteColor.color} onPress={() => router.push('/couple/invite')} style={styles.flex} />
                <Button title="Kodum Var" variant="secondary" toneColor={noteColor.color} onPress={() => router.push('/couple/accept')} style={styles.flex} />
              </View>
            )}
          </>
        )}
      </Card>

      {/* Yaklaşanlar */}
      <Card style={[styles.section, styles.compactCard, { borderColor: calendarColor.color, borderWidth: 1 }]}>
        <SectionHeader title="Yaklaşanlar" compact />
        {upcoming.length === 0 ? (
          <Pressable onPress={() => router.push('/calendar')} accessibilityRole="button" accessibilityLabel="Takvimi aç" style={styles.upcomingCompact}>
            <View style={[styles.upcomingIcon, { backgroundColor: calendarColor.tint }]}><Feather name="sun" size={18} color={calendarColor.color} /></View>
            <View style={styles.upcomingCopy}><Text style={styles.upcomingTitle}>Önünüz açık</Text><Text style={styles.upcomingDescription} numberOfLines={1}>Yeni planlar burada görünecek.</Text></View>
            <Feather name="chevron-right" size={18} color={calendarColor.color} />
          </Pressable>
        ) : (
          upcoming.slice(0, 2).map((item) => (
            <View key={item.id} style={styles.upcomingRow}>
              <Text style={styles.upcomingTitle}>{item.title}</Text>
              <Text style={styles.muted}>{item.subtitle}</Text>
            </View>
          ))
        )}
      </Card>

      <SectionHeader title="Hızlı Erişim" actionLabel="Tümü" onAction={() => router.push('/categories')} />
      <View style={styles.quickGrid}>
        {quickAccess.map((item) => (
          <Pressable key={item.title} onPress={() => router.push(item.route)} accessibilityRole="button" accessibilityLabel={item.title} style={({ pressed }) => [styles.quickItem, pressed && styles.pressed]}>
            <View style={styles.quickIcon}><Image source={item.icon} style={styles.quickIconImage} resizeMode="contain" tintColor={colors.copper} /></View>
            <Text numberOfLines={2} style={styles.quickTitle}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
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
            toneColor={colors.accent}
          />
        </View>
      </Modal>
      {uploadingPhoto ? <View pointerEvents="none" style={styles.photoUploading}><ActivityIndicator color={colors.accent} /></View> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  responsiveContent: { width: '100%', maxWidth: 650, alignSelf: 'center' },
  header: { marginTop: spacing.xs, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identityRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, minWidth: 0 },
  treeControls: { width: '100%', alignItems: 'center', gap: 1 },
  directionButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: 2, borderRadius: 20, backgroundColor: 'rgba(41,47,44,0.82)', borderWidth: 1, borderColor: 'rgba(246,233,215,0.52)', transform: [{ translateY: 14 }] },
  directionLabel: { color: colors.cream, fontSize: fontSize.sm, fontWeight: '700' },
  directionHintOverlay: { width: '100%', height: 15, lineHeight: 12, maxWidth: '100%', marginBottom: 3, textAlign: 'center', color: colors.cream, fontSize: 10, textShadowColor: 'rgba(8,45,37,0.96)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, transform: [{ translateY: 14 }] },
  directionHint: { color: colors.cream, fontSize: fontSize.xs, marginLeft: 68, marginTop: -spacing.lg, marginBottom: spacing.sm },
  couplePhoto: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: colors.copper },
  photoPlaceholder: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(41,47,44,0.78)', borderWidth: 1.5, borderColor: colors.copper },
  photoModalBackdrop: { flex: 1, backgroundColor: 'rgba(8,22,19,0.96)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  photoClose: { position: 'absolute', top: 52, right: spacing.lg, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  photoModalImage: { maxWidth: '100%', borderRadius: radius.card },
  photoModalPlaceholder: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  photoModalHint: { marginTop: spacing.md, color: colors.white, fontSize: fontSize.md },
  photoChangeButton: { minWidth: 220, marginTop: spacing.xl },
  photoUploading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  appTitle: { fontFamily: 'serif', fontSize: fontSize.xxxl, fontWeight: '600', color: colors.cream, letterSpacing: 0.3 },
  subtitle: { fontSize: fontSize.sm, color: colors.cream, marginTop: spacing.xs, fontWeight: '500' },
  dateLabel: { fontSize: fontSize.xs, color: 'rgba(246,233,215,0.82)', marginTop: 2 },
  durationPill: { alignSelf: 'flex-start', maxWidth: '100%', backgroundColor: 'rgba(41,47,44,0.84)', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, marginTop: spacing.xs },
  duration: { fontSize: fontSize.xs, color: colors.cream, fontWeight: '700' },
  durationMissing: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },
  section: { marginBottom: spacing.md },
  compactCard: { paddingVertical: spacing.xs },
  songCard: { paddingBottom: spacing.sm },
  cardActionButton: { width: '100%', marginTop: spacing.xs, minHeight: 38, paddingVertical: 4 },
  noteCard: { paddingBottom: spacing.xs },
  noteHeader: { minHeight: 27, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  noteHeaderTitle: { flex: 1, color: colors.text, fontWeight: '600', fontSize: fontSize.md },
  noteHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  allNotesAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  allNotesLabel: { fontSize: 10, fontWeight: '600', lineHeight: 14 },
  allNotesButton: { width: 24, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  note: { borderRadius: radius.card, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  noteEmoji: { fontSize: fontSize.xxl, marginBottom: spacing.xs },
  noteText: { fontSize: fontSize.md, color: '#30272A', lineHeight: 20 },
  noteMeta: { fontSize: fontSize.xs, color: '#62595B', marginTop: spacing.xs },
  muted: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19 },
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
  upcomingRow: { paddingVertical: spacing.xs },
  upcomingCompact: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  upcomingIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  upcomingCopy: { flex: 1 },
  upcomingDescription: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 1 },
  upcomingTitle: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  songCardTitle: { fontSize: fontSize.lg, color: colors.text, fontWeight: '700', marginTop: 1 },
  songCardArtist: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: '500', marginTop: 1 },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -spacing.xs, marginBottom: spacing.xl },
  quickItem: { width: '25%', alignItems: 'center', paddingHorizontal: spacing.xs },
  quickIcon: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  quickIconImage: { width: 35, height: 35 },
  quickTitle: { marginTop: spacing.xs, textAlign: 'center', fontSize: fontSize.xs, color: colors.text, fontWeight: '500', lineHeight: 15 },
  pressed: { opacity: 0.8 },
});
