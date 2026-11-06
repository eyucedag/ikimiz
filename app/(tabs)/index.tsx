import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, EmptyState, Screen, SectionHeader } from '@/src/components/ui';
import { MoodSummaryCard } from '@/src/components/MoodSummaryCard';
import { DynamicSky } from '@/src/components/DynamicSky';
import { categories, getCategoryColor, getCategoryRoute } from '@/src/constants/categories';
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
import { kissService } from '@/src/services/kissService';
import { Category } from '@/src/types';

type HomeSection = 'song' | 'partner-note' | 'mood' | 'upcoming' | 'categories' | `category:${string}`;
const HOME_CATEGORY_ITEMS: Category[] = [
  ...categories.filter((category) => category.slug !== 'opucuk').map((category) => category.slug === 'ekrana-not' ? { ...category, title: 'Partnerinden Not' } : category),
  { slug: 'ruh-halim', title: 'Ruh Halim', icon: 'heart', color: '#AD633F', tint: '#F2E7DB', description: 'Bugünkü ruh halinizi partnerinizle paylaşın.' },
];
const HOME_GENERAL_CATEGORY_ITEMS = HOME_CATEGORY_ITEMS.filter((category) => !['ekrana-not', 'gunun-sarkisi', 'ruh-halim'].includes(category.slug));
const BASE_HOME_SECTIONS: HomeSection[] = ['upcoming'];
const DEFAULT_HOME_ORDER: HomeSection[] = ['categories', 'upcoming'];
const HOME_SECTION_TITLES: Record<'song' | 'partner-note' | 'mood' | 'upcoming' | 'categories', string> = {
  song: 'Günün Şarkısı', 'partner-note': 'Partnerinden Not', mood: 'Ruh Halim', upcoming: 'Yaklaşanlar', categories: 'Kategoriler',
};
const getHomeSectionTitle = (section: HomeSection) => section.startsWith('category:')
  ? HOME_CATEGORY_ITEMS.find((category) => category.slug === section.slice('category:'.length))?.title ?? 'Kategori'
  : HOME_SECTION_TITLES[section as keyof typeof HOME_SECTION_TITLES];
const HOME_CATEGORY_ICONS: Record<string, typeof auroraIcons.calendar> = {
  takvim: auroraIcons.calendar,
  'ozel-gunler': auroraIcons.specialDates,
  listeler: auroraIcons.lists,
  notlar: auroraIcons.notebook,
  'onemli-belgeler': auroraIcons.documents,
  galeri: auroraIcons.gallery,
  'sesli-anilar': auroraIcons.audioMemories,
  gorevler: auroraIcons.tasks,
  'hediye-radari': auroraIcons.giftRadar,
  'bilinmesi-gerekenler': auroraIcons.importantFacts,
  'gezilen-yerler': auroraIcons.places,
  'birlikte-adimlar': auroraIcons.steps,
  'ekrana-not': auroraIcons.notebook,
};

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
  const [homeLayoutVisible, setHomeLayoutVisible] = useState(false);
  const [homeOrder, setHomeOrder] = useState<HomeSection[]>(DEFAULT_HOME_ORDER);
  const [hiddenHomeSections, setHiddenHomeSections] = useState<HomeSection[]>([]);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [todaySong, setTodaySong] = useState<{ title: string; artist: string; url: string } | null>(null);
  const [sendingKiss, setSendingKiss] = useState(false);
  const direction = useCoupleDirection(couple.couple?.id, user?.id, couple.partner?.id);
  useAutomaticNearbySteps(user?.id, couple.couple?.id, couple.partner?.id);
  const [now, setNow] = useState(Date.now());
  const homeLayoutStorageKey = user?.id ? `@ikimiz/home-layout:${user.id}` : null;

  useEffect(() => {
    let cancelled = false;
    setHomeOrder(DEFAULT_HOME_ORDER);
    setHiddenHomeSections([]);
    if (!homeLayoutStorageKey) return () => { cancelled = true; };
    void AsyncStorage.getItem(homeLayoutStorageKey).then((saved) => {
      if (cancelled || !saved) return;
      try {
        const parsed = JSON.parse(saved) as { order?: unknown; hidden?: unknown };
        const normalize = (value: unknown): HomeSection[] => {
          if (value === 'quick-access' || value === 'categories' || value === 'song' || value === 'partner-note' || value === 'mood' || (typeof value === 'string' && value.startsWith('category:'))) return ['categories'];
          if (typeof value !== 'string') return [];
          if ((BASE_HOME_SECTIONS as string[]).includes(value)) return [value as HomeSection];
          return [];
        };
        const savedOrder = Array.isArray(parsed.order) ? [...new Set(parsed.order.flatMap(normalize))] : [];
        const savedHidden = Array.isArray(parsed.hidden) ? [...new Set(parsed.hidden.flatMap(normalize))] : [];
        setHomeOrder([...savedOrder, ...DEFAULT_HOME_ORDER.filter((section) => !savedOrder.includes(section))]);
        setHiddenHomeSections(savedHidden);
      } catch { /* Ignore outdated or invalid local preferences. */ }
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [homeLayoutStorageKey]);
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

  const persistHomeLayout = (order: HomeSection[], hidden: HomeSection[]) => {
    setHomeOrder(order);
    setHiddenHomeSections(hidden);
    if (homeLayoutStorageKey) {
      void AsyncStorage.setItem(homeLayoutStorageKey, JSON.stringify({ order, hidden }))
        .catch(() => Alert.alert('Düzen kaydedilemedi', 'Ana ekran düzeni bu cihaza kaydedilemedi.'));
    }
  };

  const moveHomeSection = (section: HomeSection, offset: -1 | 1) => {
    const index = homeOrder.indexOf(section);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= homeOrder.length) return;
    const next = [...homeOrder];
    [next[index], next[target]] = [next[target], next[index]];
    persistHomeLayout(next, hiddenHomeSections);
  };

  const toggleHomeSection = (section: HomeSection) => {
    const next = hiddenHomeSections.includes(section)
      ? hiddenHomeSections.filter((item) => item !== section)
      : [...hiddenHomeSections, section];
    persistHomeLayout(homeOrder, next);
  };

  const sendKissFromHome = async () => {
    if (sendingKiss) return;
    if (!user?.id || !couple.partner?.id || !couple.couple?.id) {
      Alert.alert('Önce eşleşin', 'Öpücük göndermek için partnerinizle eşleşmeniz gerekiyor.');
      return;
    }
    setSendingKiss(true);
    try {
      await kissService.send({ ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id });
      Alert.alert('Öpücük gönderildi', 'Öpücüğün partnerine gitti.');
    } catch (error) {
      Alert.alert('Öpücük gönderilemedi', error instanceof Error ? error.message : 'Lütfen yeniden deneyin.');
    } finally {
      setSendingKiss(false);
    }
  };

  const renderCategoryCard = (category: Category) => {
    const categoryTone = getCategoryColor(category.slug);
    return (
      <Card
        key={category.slug}
        onPress={() => router.push(getCategoryRoute(category.slug))}
        accessibilityLabel={`${category.title}. ${category.description}`}
        style={styles.homeCategoryCard}
      >
        <View style={[styles.homeCategoryIcon, { backgroundColor: categoryTone.tint }]}>
          <Image source={HOME_CATEGORY_ICONS[category.slug] ?? auroraIcons.calendar} style={styles.homeCategoryIconImage} resizeMode="contain" tintColor={categoryTone.color} />
        </View>
        <View style={styles.homeCategoryCopy}>
          <Text numberOfLines={1} style={styles.homeCategoryTitle}>{category.title}</Text>
          <Text numberOfLines={1} style={styles.homeCategoryDescription}>{category.description}</Text>
        </View>
        <View style={[styles.homeCategoryArrow, { backgroundColor: categoryTone.tint }]}>
          <Feather name="chevron-right" size={16} color={categoryTone.color} />
        </View>
      </Card>
    );
  };

  const renderHomeSection = (section: HomeSection): React.ReactNode => {
    switch (section) {
      case 'categories': return <>
        <SectionHeader title="Kategoriler" compact />
        {renderHomeSection('song')}
        {renderHomeSection('partner-note')}
        {renderHomeSection('mood')}
        {HOME_GENERAL_CATEGORY_ITEMS.map(renderCategoryCard)}
      </>;
      case 'song': return (<>
      <Card style={[styles.section, styles.songCard, { borderColor: songColor.color, borderWidth: 1 }]}>
        <Pressable onPress={() => router.push('/song-of-the-day')} accessibilityRole="button" accessibilityLabel="Günün Şarkısını aç" style={styles.songHeading}>
          <View style={[styles.songIcon, { backgroundColor: songColor.tint }]}><Feather name="music" size={21} color={songColor.color} /></View>
          <View style={styles.upcomingCopy}>
            <Text style={[styles.songEyebrow, { color: songColor.color }]}>Günün Şarkısı</Text>
            <Text style={styles.songPrompt} numberOfLines={1}>{todaySong ? 'Bugün sizin için seçildi' : 'Bugün birbirinize bir şarkı seçin'}</Text>
          </View>
          <Feather name="chevron-right" size={19} color={songColor.color} />
        </Pressable>
        {todaySong ? (
          <View style={[styles.songDetails, { backgroundColor: songColor.tint }]}>
            <Text style={styles.songCardTitle} numberOfLines={2}>{todaySong.title}</Text>
            <Text style={styles.songCardArtist} numberOfLines={1}>{todaySong.artist}</Text>
          </View>
        ) : null}
        <Button
          title={todaySong?.url ? 'Şarkıyı dinle' : 'Şarkı seç'}
          icon={todaySong?.url ? 'play' : 'music'}
          toneColor={songColor.color}
          onPress={() => todaySong?.url ? void listenToTodaySong() : router.push('/song-of-the-day')}
          style={styles.cardActionButton}
        />
      </Card>


      </>);
      case 'partner-note': return (<>
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


      </>);
      case 'upcoming': return (<>
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


      </>);
      case 'mood': return <MoodSummaryCard
        today={moods.today}
        partnerToday={moods.partnerToday}
        partnerName={couple.partner?.displayName ?? 'Partneriniz'}
        paired={couple.isPaired}
        loading={moods.loading || couple.loading}
        error={moods.error}
        onPress={() => router.push('/mood')}
      />;
      default: return null;
    }
  };

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
      <Screen inTabs scroll refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.responsiveContent}>
      <View style={styles.homeTopBar}>
        <Text style={styles.homeTopTitle} accessibilityRole="header">İkimiz</Text>
        <View style={styles.homeTopActions}>
          <Pressable onPress={() => void sendKissFromHome()} accessibilityRole="button" accessibilityLabel="Partnerinize öpücük gönder" style={styles.kissTopButton} disabled={sendingKiss}>
            {sendingKiss ? <ActivityIndicator color={colors.copper} size="small" /> : <Text style={styles.kissTopEmoji}>💋</Text>}
          </Pressable>
          <Pressable onPress={() => setHomeLayoutVisible(true)} accessibilityRole="button" accessibilityLabel="Ana ekranı düzenle" style={styles.layoutEditButton}>
            <Feather name="sliders" size={17} color={colors.text} />
          </Pressable>
        </View>
      </View>
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
            <Text style={styles.subtitle}>{greeting(new Date(now))}, {user?.displayName}</Text>
            <Text style={styles.dateLabel}>{todayLabel(new Date(now))}</Text>
            {togetherDuration ? <View style={styles.durationPill}><Text style={styles.duration}>{togetherDuration}</Text></View> : couple.isPaired ? <Text style={styles.durationMissing}>Birlikte olduğunuz zamanı profilden ekleyin</Text> : null}
          </View>
        </View>
      </View>
      </DynamicSky>

      {homeOrder.filter((section) => !hiddenHomeSections.includes(section)).map((section) => (
        <React.Fragment key={section}>{renderHomeSection(section)}</React.Fragment>
      ))}
      <Modal visible={homeLayoutVisible} transparent animationType="slide" onRequestClose={() => setHomeLayoutVisible(false)}>
        <View style={styles.homeLayoutBackdrop}>
          <View style={styles.homeLayoutSheet}>
            <View style={styles.homeLayoutHeader}>
              <Text style={styles.homeLayoutTitle}>Ana ekranı düzenle</Text>
              <Pressable onPress={() => setHomeLayoutVisible(false)} accessibilityRole="button" accessibilityLabel="Düzenlemeyi kapat" style={styles.homeLayoutClose}>
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>
            <Text style={styles.homeLayoutDescription}>Kategoriler birlikte taşınır, gösterilir veya gizlenir. Bu düzen yalnızca senin hesabında saklanır.</Text>
            {homeOrder.map((section, index) => {
              const hidden = hiddenHomeSections.includes(section);
              return (
                <View key={section}>
                  <View style={[styles.homeLayoutRow, hidden && styles.homeLayoutRowHidden]}>
                    <Text style={[styles.homeLayoutRowTitle, hidden && styles.homeLayoutTextHidden]}>{getHomeSectionTitle(section)}</Text>
                    <View style={styles.homeLayoutActions}>
                      <Pressable onPress={() => moveHomeSection(section, -1)} disabled={index === 0} accessibilityRole="button" accessibilityLabel={`${getHomeSectionTitle(section)} bölümünü yukarı taşı`} style={styles.homeLayoutIconButton}>
                        <Feather name="chevron-up" size={19} color={index === 0 ? colors.textTertiary : colors.accent} />
                      </Pressable>
                      <Pressable onPress={() => moveHomeSection(section, 1)} disabled={index === homeOrder.length - 1} accessibilityRole="button" accessibilityLabel={`${getHomeSectionTitle(section)} bölümünü aşağı taşı`} style={styles.homeLayoutIconButton}>
                        <Feather name="chevron-down" size={19} color={index === homeOrder.length - 1 ? colors.textTertiary : colors.accent} />
                      </Pressable>
                      <Pressable onPress={() => toggleHomeSection(section)} accessibilityRole="button" accessibilityLabel={hidden ? `${getHomeSectionTitle(section)} bölümünü göster` : `${getHomeSectionTitle(section)} bölümünü gizle`} style={styles.homeLayoutIconButton}>
                        <Feather name={hidden ? 'eye-off' : 'eye'} size={18} color={colors.accent} />
                      </Pressable>
                    </View>
                  </View>
                  {section === 'categories' ? (
                    <View style={[styles.homeLayoutCategoryList, hidden && styles.homeLayoutRowHidden]}>
                      {HOME_CATEGORY_ITEMS.map((category) => (
                        <View key={category.slug} style={styles.homeLayoutCategoryChip}>
                          <Text style={styles.homeLayoutCategoryText}>{category.title}</Text>
                        </View>
                      ))}
                      <View style={styles.homeLayoutCategoryChip}><Text style={styles.homeLayoutCategoryText}>Öpücük · üstte</Text></View>
                    </View>
                  ) : null}
                </View>
              );
            })}
            <View style={styles.homeLayoutFooter}>
              <Pressable onPress={() => persistHomeLayout(DEFAULT_HOME_ORDER, [])} accessibilityRole="button" style={styles.homeLayoutReset}>
                <Text style={styles.homeLayoutResetText}>Varsayılana dön</Text>
              </Pressable>
              <Button title="Tamam" compact onPress={() => setHomeLayoutVisible(false)} style={styles.homeLayoutDone} />
            </View>
          </View>
        </View>
      </Modal>
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
  homeTopBar: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  homeTopActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kissTopButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  kissTopEmoji: { fontSize: 17, lineHeight: 21 },
  homeTopTitle: { color: colors.text, fontFamily: 'serif', fontSize: fontSize.xxl, fontWeight: '600' },
  header: { marginTop: spacing.xs, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  identityRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, minWidth: 0 },
  layoutEditButton: { width: 32, height: 32, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, marginLeft: spacing.xs },
  treeControls: { width: '100%', alignItems: 'center', gap: 1 },
  directionButton: { minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: 2, borderRadius: 20, backgroundColor: 'rgba(41,47,44,0.82)', borderWidth: 1, borderColor: 'rgba(246,233,215,0.52)', transform: [{ translateY: 14 }] },
  directionLabel: { color: colors.cream, fontSize: fontSize.sm, fontWeight: '700' },
  directionHintOverlay: { width: '100%', height: 15, lineHeight: 12, maxWidth: '100%', marginBottom: 3, textAlign: 'center', color: colors.cream, fontSize: 10, textShadowColor: 'rgba(8,45,37,0.96)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, transform: [{ translateY: 14 }] },
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
  songCard: { paddingBottom: spacing.md },
  songHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  songIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  songEyebrow: { fontSize: fontSize.sm, fontWeight: '700' },
  songPrompt: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  songDetails: { marginTop: spacing.sm, marginBottom: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.control },
  cardActionButton: { width: '100%', marginTop: spacing.sm, minHeight: 42, paddingVertical: spacing.xs },
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
  songCardTitle: { fontSize: fontSize.xl, color: colors.text, fontWeight: '700', lineHeight: 24 },
  songCardArtist: { color: colors.textSecondary, fontSize: fontSize.md, fontWeight: '500', marginTop: spacing.xs },
  homeCategoryList: { gap: spacing.sm, marginBottom: spacing.md },
  homeCategoryCard: { minHeight: 72, width: '100%', flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  homeCategoryIcon: { width: 42, height: 42, flexShrink: 0, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  homeCategoryIconImage: { width: 28, height: 28 },
  homeCategoryCopy: { flex: 1, minWidth: 0 },
  homeCategoryTitle: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  homeCategoryDescription: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 3 },
  homeCategoryArrow: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  homeLayoutBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(10,20,18,0.58)', paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  homeLayoutSheet: { width: '100%', maxWidth: 540, alignSelf: 'center', borderRadius: radius.card, padding: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  homeLayoutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  homeLayoutTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  homeLayoutClose: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.beige },
  homeLayoutDescription: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 17, marginBottom: spacing.sm },
  homeLayoutRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingVertical: 4 },
  homeLayoutRowHidden: { opacity: 0.62 },
  homeLayoutRowTitle: { flex: 1, color: colors.text, fontSize: fontSize.sm, fontWeight: '600' },
  homeLayoutTextHidden: { color: colors.textSecondary },
  homeLayoutCategoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingHorizontal: spacing.xs, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  homeLayoutCategoryChip: { minHeight: 25, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.beige },
  homeLayoutCategoryText: { color: colors.textSecondary, fontSize: 10, fontWeight: '600' },
  homeLayoutActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  homeLayoutIconButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: colors.beige },
  homeLayoutFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  homeLayoutReset: { minHeight: 40, justifyContent: 'center', paddingHorizontal: spacing.xs },
  homeLayoutResetText: { color: colors.accent, fontSize: fontSize.sm, fontWeight: '700' },
  homeLayoutDone: { minWidth: 112 },
  pressed: { opacity: 0.8 },
});
