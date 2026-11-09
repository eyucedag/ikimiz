import { useRequestGuard } from '@/src/hooks/useRequestGuard';
import { TogetherDuration } from '@/src/components/TogetherDuration';
import { useLocalDate } from '@/src/hooks/useLocalDate';
import { useNow } from '@/src/hooks/useNow';
import { readFileBytes } from '@/src/utils/files';
import React, { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, Screen, SectionHeader } from '@/src/components/ui';
import { MoodSummaryCard } from '@/src/components/MoodSummaryCard';
import { DynamicSky } from '@/src/components/DynamicSky';
import { CoupleFlower } from '@/src/components/CoupleFlower';
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
import { DailySong, songOfTheDayService } from '@/src/services/songOfTheDayService';
import { greeting, relativeTime, todayLabel, localDateKey } from '@/src/utils/date';
import { useCouplePresence } from '@/src/hooks/useCouplePresence';
import { kissService } from '@/src/services/kissService';

import { galleryService, GalleryPhoto } from '@/src/services/galleryService';
import { listService, SharedList } from '@/src/services/listService';
import { notebookService, NotebookNote } from '@/src/services/notebookService';
import { documentService, CoupleDocument, CoupleDocumentLink } from '@/src/services/documentService';
import { audioMemoryService, AudioMemory } from '@/src/services/audioMemoryService';
import {
  taskService,
  giftService,
  factService,
  Task,
  GiftIdea,
  PartnerFact,
} from '@/src/services/coupleCategoryService';
import { travelService, TravelPlace } from '@/src/services/travelService';
import { presenceService, CoupleSteps } from '@/src/services/presenceService';
import { Category } from '@/src/types';

type HomeSection = 'song' | 'partner-note' | 'mood' | 'upcoming';
type HomePreviewData = {
  gallery: GalleryPhoto[];
  lists: SharedList[];
  notes: NotebookNote[];
  documents: CoupleDocument[];
  links: CoupleDocumentLink[];
  audio: AudioMemory[];
  tasks: Task[];
  gifts: GiftIdea[];
  facts: PartnerFact[];
  places: TravelPlace[];
  steps: CoupleSteps[];
};
const EMPTY_HOME_PREVIEWS: HomePreviewData = {
  gallery: [],
  lists: [],
  notes: [],
  documents: [],
  links: [],
  audio: [],
  tasks: [],
  gifts: [],
  facts: [],
  places: [],
  steps: [],
};
const HOME_CATEGORY_ITEMS: Category[] = [
  ...categories
    .filter((category) => category.slug !== 'opucuk')
    .map((category) =>
      category.slug === 'ekrana-not' ? { ...category, title: 'Partnerinden Not' } : category,
    ),
  {
    slug: 'ruh-halim',
    title: 'Ruh Halim',
    icon: 'heart',
    color: '#AD633F',
    tint: '#F2E7DB',
    description: 'Bugünkü ruh halinizi partnerinizle paylaşın.',
  },
  {
    slug: 'yaklasanlar',
    title: 'Yaklaşanlar',
    icon: 'calendar',
    color: '#4B78C5',
    tint: '#EAF0FA',
    description: 'Yaklaşan etkinliklerinizi ve özel günlerinizi görün.',
  },
];
const DEFAULT_HOME_CATEGORY_ORDER = [
  'gunun-sarkisi',
  'ekrana-not',
  'ruh-halim',
  ...HOME_CATEGORY_ITEMS.filter(
    (category) => !['gunun-sarkisi', 'ekrana-not', 'ruh-halim'].includes(category.slug),
  ).map((category) => category.slug),
];
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
  yaklasanlar: auroraIcons.calendar,
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
  const tabletLayout = Math.min(width, height) >= 600;
  const landscapeTablet = tabletLayout && width > height;
  const portraitTablet = tabletLayout && !landscapeTablet;
  const homeContentMaxWidth = landscapeTablet ? 1120 : portraitTablet ? 820 : 900;
  const [refreshing, setRefreshing] = useState(false);
  const [homeLayoutVisible, setHomeLayoutVisible] = useState(false);
  const [homeCategoryOrder, setHomeCategoryOrder] = useState<string[]>(DEFAULT_HOME_CATEGORY_ORDER);
  const [hiddenHomeCategories, setHiddenHomeCategories] = useState<string[]>([]);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [todaySongs, setTodaySongs] = useState<DailySong[]>([]);
  const [homePreviews, setHomePreviews] = useState<HomePreviewData>(EMPTY_HOME_PREVIEWS);
  const [sendingKiss, setSendingKiss] = useState(false);
  const direction = useCouplePresence();
  const now = useNow();
  const homeLayoutStorageKey = user?.id ? `@ikimiz/home-layout:${user.id}` : null;

  useEffect(() => {
    let cancelled = false;
    setHomeCategoryOrder(DEFAULT_HOME_CATEGORY_ORDER);
    setHiddenHomeCategories([]);
    if (!homeLayoutStorageKey)
      return () => {
        cancelled = true;
      };
    void AsyncStorage.getItem(homeLayoutStorageKey)
      .then((saved) => {
        if (cancelled || !saved) return;
        try {
          const parsed = JSON.parse(saved) as {
            order?: unknown;
            categoryOrder?: unknown;
            hiddenCategories?: unknown;
          };
          const normalizeCategory = (value: unknown): string | null => {
            if (typeof value !== 'string') return null;
            const legacySlugs: Record<string, string> = {
              song: 'gunun-sarkisi',
              'partner-note': 'ekrana-not',
              mood: 'ruh-halim',
            };
            const slug = value.startsWith('category:')
              ? value.slice('category:'.length)
              : (legacySlugs[value] ?? value);
            return HOME_CATEGORY_ITEMS.some((category) => category.slug === slug) ? slug : null;
          };
          const storedCategoryValues = Array.isArray(parsed.categoryOrder)
            ? parsed.categoryOrder
            : Array.isArray(parsed.order)
              ? parsed.order
              : [];
          const savedCategoryOrder = [
            ...new Set(
              storedCategoryValues.map(normalizeCategory).filter((slug): slug is string => slug !== null),
            ),
          ];
          setHomeCategoryOrder([
            ...savedCategoryOrder,
            ...DEFAULT_HOME_CATEGORY_ORDER.filter((slug) => !savedCategoryOrder.includes(slug)),
          ]);
          const savedHiddenCategories = Array.isArray(parsed.hiddenCategories)
            ? [
                ...new Set(
                  parsed.hiddenCategories
                    .map(normalizeCategory)
                    .filter((slug): slug is string => slug !== null),
                ),
              ]
            : [];
          setHiddenHomeCategories(savedHiddenCategories);
        } catch {
          /* Ignore outdated or invalid local preferences. */
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [homeLayoutStorageKey]);
  const songDate = useLocalDate();
  const beginSongs = useRequestGuard();
  const beginPreviews = useRequestGuard();

  const refreshTodaySong = useCallback(async () => {
    const current = beginSongs();
    const coupleId = couple.couple?.id;
    if (!coupleId) {
      setTodaySongs([]);
      return;
    }
    try {
      const songs = await songOfTheDayService.list(coupleId, songDate);
      if (current()) setTodaySongs(songs);
    } catch {
      /* Keep the home screen usable if the song cannot be fetched. */
    }
  }, [couple.couple?.id, songDate, beginSongs]);

  const refreshHomePreviews = useCallback(async () => {
    const current = beginPreviews();
    const coupleId = couple.couple?.id;
    if (!coupleId) {
      setHomePreviews(EMPTY_HOME_PREVIEWS);
      return;
    }
    const localDate = localDateKey();
    const [gallery, lists, notes, documents, links, audio, tasks, gifts, facts, places, steps] =
      await Promise.allSettled([
        galleryService.list(coupleId, 4),
        listService.list(coupleId),
        notebookService.list(coupleId, 1),
        documentService.list(coupleId, 1),
        documentService.listLinks(coupleId, 1),
        audioMemoryService.list(coupleId, 1),
        taskService.list(coupleId),
        giftService.list(coupleId),
        factService.list(coupleId),
        travelService.list(coupleId),
        presenceService.steps(coupleId, localDate),
      ]);
    if (!current()) return;
    setHomePreviews((previous) => ({
      gallery: gallery.status === 'fulfilled' ? gallery.value : previous.gallery,
      lists: lists.status === 'fulfilled' ? lists.value : previous.lists,
      notes: notes.status === 'fulfilled' ? notes.value : previous.notes,
      documents: documents.status === 'fulfilled' ? documents.value : previous.documents,
      links: links.status === 'fulfilled' ? links.value : previous.links,
      audio: audio.status === 'fulfilled' ? audio.value : previous.audio,
      tasks: tasks.status === 'fulfilled' ? tasks.value : previous.tasks,
      gifts: gifts.status === 'fulfilled' ? gifts.value : previous.gifts,
      facts: facts.status === 'fulfilled' ? facts.value : previous.facts,
      places: places.status === 'fulfilled' ? places.value : previous.places,
      steps: steps.status === 'fulfilled' ? steps.value : previous.steps,
    }));
  }, [couple.couple?.id, beginPreviews]);

  useFocusEffect(
    useCallback(() => {
      void refreshTodaySong();
      void refreshHomePreviews();
    }, [refreshTodaySong, refreshHomePreviews]),
  );

  useEffect(() => {
    const coupleId = couple.couple?.id;
    if (!coupleId) return;
    const channel = supabase
      .channel(`home-daily-song-${coupleId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'daily_songs', filter: `couple_id=eq.${coupleId}` },
        () => {
          void refreshTodaySong();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [couple.couple?.id, refreshTodaySong]);

  useFocusEffect(
    useCallback(() => {
      if (latestFromPartner && !latestFromPartner.readAt) void markRead(latestFromPartner.id);
    }, [latestFromPartner, markRead]),
  );

  const persistHomeLayout = (
    categoryOrder: string[] = homeCategoryOrder,
    hiddenCategories: string[] = hiddenHomeCategories,
  ) => {
    setHomeCategoryOrder(categoryOrder);
    setHiddenHomeCategories(hiddenCategories);
    if (homeLayoutStorageKey) {
      void AsyncStorage.setItem(
        homeLayoutStorageKey,
        JSON.stringify({ categoryOrder, hiddenCategories }),
      ).catch(() => Alert.alert('Düzen kaydedilemedi', 'Ana ekran düzeni bu cihaza kaydedilemedi.'));
    }
  };

  const moveHomeCategory = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= homeCategoryOrder.length) return;
    const next = [...homeCategoryOrder];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    persistHomeLayout(next);
  };

  const toggleHomeCategory = (slug: string) => {
    const hidden = hiddenHomeCategories.includes(slug)
      ? hiddenHomeCategories.filter((item) => item !== slug)
      : [...hiddenHomeCategories, slug];
    persistHomeLayout(homeCategoryOrder, hidden);
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

  const renderCategoryPreview = (category: Category, toneColor: string) => {
    const labelStyle = [styles.previewMainText, { color: toneColor }];
    const detailStyle = styles.previewDetailText;
    const empty = (message: string) => (
      <Text numberOfLines={2} style={styles.homeCategoryDescription}>
        {message}
      </Text>
    );
    switch (category.slug) {
      case 'galeri':
        return homePreviews.gallery.length ? (
          <View style={styles.galleryPreviewStrip}>
            {homePreviews.gallery.slice(0, 4).map((photo) => (
              <Image
                key={photo.id}
                source={{ uri: photo.imageUrl }}
                style={styles.galleryPreviewPhoto}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : (
          empty('İlk ortak fotoğrafınızı ekleyin.')
        );
      case 'listeler': {
        const list = homePreviews.lists[0];
        return list ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {list.title}
            </Text>
            <Text style={detailStyle}>
              {list.checkedCount}/{list.itemCount} madde tamamlandı · {homePreviews.lists.length} liste
            </Text>
          </View>
        ) : (
          empty('Birlikte kullanacağınız ilk listeyi oluşturun.')
        );
      }
      case 'notlar': {
        const note = homePreviews.notes[0];
        return note ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {note.title}
            </Text>
            <Text style={detailStyle} numberOfLines={2}>
              {note.body.replace(/<[^>]*>/g, ' ').trim()}
            </Text>
          </View>
        ) : (
          empty('Önemli bilgilerinizi ortak not defterinize ekleyin.')
        );
      }
      case 'onemli-belgeler': {
        const file = homePreviews.documents[0];
        const link = homePreviews.links[0];
        return file || link ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {file?.displayName ?? link?.displayName}
            </Text>
            <Text style={detailStyle}>Son eklenen ortak doküman veya bağlantı</Text>
          </View>
        ) : (
          empty('Dosya veya bağlantılarınızı burada saklayın.')
        );
      }
      case 'sesli-anilar': {
        const memory = homePreviews.audio[0];
        return memory ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {memory.title || 'Sesli anı'}
            </Text>
            <Text style={detailStyle}>
              {Math.floor(memory.durationSeconds / 60)} dk {memory.durationSeconds % 60} sn · Son ses kaydı
            </Text>
          </View>
        ) : (
          empty('Birbirinize ilk sesli anınızı bırakın.')
        );
      }
      case 'gorevler': {
        const task = homePreviews.tasks.find((item) => !item.completed_at);
        return task ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              □ {task.title}
            </Text>
            <Text style={detailStyle}>
              {homePreviews.tasks.filter((item) => !item.completed_at).length} bekleyen görev
            </Text>
          </View>
        ) : (
          empty(
            homePreviews.tasks.length
              ? 'Bütün görevler tamamlandı. Harikasınız!'
              : 'Birlikte tamamlayacağınız ilk işi ekleyin.',
          )
        );
      }
      case 'hediye-radari': {
        const gift = homePreviews.gifts[0];
        return gift ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {gift.title}
            </Text>
            <Text style={detailStyle}>
              {homePreviews.gifts.length} gizli hediye fikri
              {gift.price ? ` · ${gift.price.toLocaleString('tr-TR')} ₺` : ''}
            </Text>
          </View>
        ) : (
          empty('Aklınıza gelen hediye fikirlerini kaydedin.')
        );
      }
      case 'bilinmesi-gerekenler': {
        const fact = homePreviews.facts[0];
        return fact ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {fact.label}
            </Text>
            <Text style={detailStyle} numberOfLines={2}>
              {fact.value || `${homePreviews.facts.length} önemli bilgi kayıtlı`}
            </Text>
          </View>
        ) : (
          empty('Birbiriniz için önemli bilgileri kaydedin.')
        );
      }
      case 'gezilen-yerler': {
        const place = homePreviews.places[0];
        return place ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {place.city}, {place.country}
            </Text>
            <Text style={detailStyle}>{homePreviews.places.length} birlikte keşfedilen yer</Text>
          </View>
        ) : (
          empty('Birlikte gittiğiniz ilk yeri haritaya ekleyin.')
        );
      }
      case 'birlikte-adimlar': {
        const total = homePreviews.steps.reduce((sum, row) => sum + row.steps, 0);
        return homePreviews.steps.length ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle}>{total.toLocaleString('tr-TR')} adım</Text>
            <Text style={detailStyle}>Bugün birlikte atılan adımlar</Text>
          </View>
        ) : (
          empty('Bugünkü ortak adımlarınız burada görünür.')
        );
      }
      case 'takvim':
      case 'yaklasanlar': {
        const nextItem = upcoming.find((item) =>
          category.slug === 'takvim' ? item.kind !== 'special' : true,
        );
        return nextItem ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {nextItem.title}
            </Text>
            <Text style={detailStyle}>{nextItem.subtitle}</Text>
          </View>
        ) : (
          empty('Henüz yaklaşan plan yok. Yeni etkinliklerinizi burada göreceksiniz.')
        );
      }
      case 'ozel-gunler': {
        const nextSpecial = upcoming.find((item) => item.kind === 'special');
        return nextSpecial ? (
          <View style={styles.previewCopy}>
            <Text style={labelStyle} numberOfLines={1}>
              {nextSpecial.title}
            </Text>
            <Text style={detailStyle}>{nextSpecial.subtitle}</Text>
          </View>
        ) : (
          empty('Size özel tarihleri birlikte biriktirin.')
        );
      }
      default:
        return (
          <Text numberOfLines={2} style={styles.homeCategoryDescription}>
            {category.description}
          </Text>
        );
    }
  };

  const renderCategoryCard = (category: Category) => {
    const categoryTone = getCategoryColor(category.slug);
    return (
      <Card
        key={category.slug}
        onPress={() => router.push(getCategoryRoute(category.slug))}
        accessibilityLabel={`${category.title}. ${category.description}`}
        style={[styles.section, styles.richCategoryCard, { borderColor: categoryTone.color }]}
      >
        <View style={styles.richCategoryHeader}>
          <View style={[styles.homeCategoryIcon, { backgroundColor: categoryTone.tint }]}>
            <Image
              source={HOME_CATEGORY_ICONS[category.slug] ?? auroraIcons.calendar}
              style={styles.homeCategoryIconImage}
              resizeMode="contain"
              tintColor={categoryTone.color}
            />
          </View>
          <Text numberOfLines={1} style={styles.homeCategoryTitle}>
            {category.title}
          </Text>
          <View style={[styles.homeCategoryArrow, { backgroundColor: categoryTone.tint }]}>
            <Feather name="chevron-right" size={16} color={categoryTone.color} />
          </View>
        </View>
        <View style={[styles.richCategoryPreview, { backgroundColor: categoryTone.tint }]}>
          {renderCategoryPreview(category, categoryTone.color)}
        </View>
        <View style={[styles.richCategoryAction, { backgroundColor: categoryTone.color }]}>
          <Feather name="arrow-right" size={16} color={colors.cream} />
          <Text style={styles.richCategoryActionText}>Bölümü aç</Text>
        </View>
      </Card>
    );
  };

  const renderHomeSection = (section: HomeSection): React.ReactNode => {
    switch (section) {
      case 'song':
        return (
          <>
            <Card style={[styles.section, styles.songCard, { borderColor: songColor.color, borderWidth: 1 }]}>
              <Pressable
                onPress={() => router.push('/song-of-the-day')}
                accessibilityRole="button"
                accessibilityLabel="Günün Şarkısını aç"
                style={styles.songHeading}
              >
                <View style={[styles.songIcon, { backgroundColor: songColor.tint }]}>
                  <Feather name="music" size={21} color={songColor.color} />
                </View>
                <View style={styles.upcomingCopy}>
                  <Text style={[styles.songEyebrow, { color: songColor.color }]}>Günün Şarkısı</Text>
                  <Text style={styles.songPrompt} numberOfLines={1}>
                    {todaySongs.length === 2
                      ? 'İkinizin de şarkısı hazır'
                      : todaySongs.length === 1
                        ? 'Bir şarkı seçildi, sıra sende'
                        : 'Bugün birbirinize bir şarkı seçin'}
                  </Text>
                </View>
                <Feather name="chevron-right" size={19} color={songColor.color} />
              </Pressable>
              {todaySongs.map((dailySong) => (
                <View key={dailySong.id} style={[styles.songDetails, { backgroundColor: songColor.tint }]}>
                  <View style={styles.songPreviewCopy}>
                    <Text style={styles.songCardTitle} numberOfLines={1}>
                      {dailySong.title}
                    </Text>
                    <Text style={styles.songCardArtist} numberOfLines={1}>
                      {dailySong.artist} ·{' '}
                      {dailySong.ownerId === user?.id
                        ? 'Senin seçimin'
                        : (couple.partner?.displayName ?? 'Partnerinin seçimi')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      void listenToTodaySong(dailySong.url);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${dailySong.title} şarkısını dinle`}
                    style={styles.songPreviewPlay}
                  >
                    <Feather name="play" size={15} color={songColor.color} />
                  </Pressable>
                </View>
              ))}
              <Button
                title="Şarkıları yönet"
                icon="music"
                toneColor={songColor.color}
                onPress={() => router.push('/song-of-the-day')}
                style={styles.cardActionButton}
              />
            </Card>
          </>
        );
      case 'partner-note':
        return (
          <>
            {/* Partnerinden Not */}
            <Card
              style={[
                styles.section,
                styles.compactCard,
                styles.noteCard,
                { borderColor: noteColor.color, borderWidth: 1 },
              ]}
            >
              {couple.loading ? (
                <View style={styles.noteHeader}>
                  <Text style={styles.noteHeaderTitle}>Partnerinden Not</Text>
                  <ActivityIndicator color={noteColor.color} />
                </View>
              ) : couple.isPaired ? (
                <>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteHeaderTitle}>Partnerinden Not</Text>
                    <View style={styles.noteHeaderActions}>
                      <View style={styles.allNotesAction}>
                        <Pressable
                          onPress={() => router.push('/screen-note/history')}
                          accessibilityRole="button"
                          accessibilityLabel="Bütün notları gör"
                          style={[styles.allNotesButton, { backgroundColor: noteColor.tint }]}
                        >
                          <Feather name="list" size={15} color={noteColor.color} />
                        </Pressable>
                        <Text style={[styles.allNotesLabel, { color: noteColor.color }]}>Bütün Notlar</Text>
                      </View>
                    </View>
                  </View>
                  {latestFromPartner ? (
                    <View style={[styles.note, { backgroundColor: latestFromPartner.backgroundColor }]}>
                      {latestFromPartner.emoji ? (
                        <Text style={styles.noteEmoji}>{latestFromPartner.emoji}</Text>
                      ) : null}
                      <Text style={styles.noteText} numberOfLines={2}>
                        {latestFromPartner.text}
                      </Text>
                      <Text style={styles.noteMeta}>
                        {couple.partner?.displayName} · {relativeTime(latestFromPartner.createdAt)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.muted}>{couple.partner?.displayName} henüz bir not bırakmadı.</Text>
                  )}
                  <Button
                    title="Not Yaz"
                    icon="edit-3"
                    toneColor={noteColor.color}
                    onPress={() => router.push('/screen-note/compose')}
                    compact
                    style={styles.cardActionButton}
                  />
                </>
              ) : (
                <>
                  <View style={styles.noteHeader}>
                    <Text style={styles.noteHeaderTitle}>Partnerinden Not</Text>
                  </View>
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
                    <Button
                      title="Davet Durumunu Gör"
                      toneColor={noteColor.color}
                      onPress={() => router.push('/couple/invite')}
                      style={styles.cardActionButton}
                    />
                  ) : (
                    <View style={styles.buttonRow}>
                      <Button
                        title="Davet Et"
                        icon="send"
                        toneColor={noteColor.color}
                        onPress={() => router.push('/couple/invite')}
                        style={styles.flex}
                      />
                      <Button
                        title="Kodum Var"
                        variant="secondary"
                        toneColor={noteColor.color}
                        onPress={() => router.push('/couple/accept')}
                        style={styles.flex}
                      />
                    </View>
                  )}
                </>
              )}
            </Card>
          </>
        );
      case 'upcoming':
        return (
          <>
            {/* Yaklaşanlar */}
            <Card
              style={[
                styles.section,
                styles.compactCard,
                { borderColor: calendarColor.color, borderWidth: 1 },
              ]}
            >
              <SectionHeader title="Yaklaşanlar" compact />
              {upcoming.length === 0 ? (
                <Pressable
                  onPress={() => router.push('/calendar')}
                  accessibilityRole="button"
                  accessibilityLabel="Takvimi aç"
                  style={styles.upcomingCompact}
                >
                  <View style={[styles.upcomingIcon, { backgroundColor: calendarColor.tint }]}>
                    <Feather name="sun" size={18} color={calendarColor.color} />
                  </View>
                  <View style={styles.upcomingCopy}>
                    <Text style={styles.upcomingTitle}>Önünüz açık</Text>
                    <Text style={styles.upcomingDescription} numberOfLines={1}>
                      Yeni planlar burada görünecek.
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={18} color={calendarColor.color} />
                </Pressable>
              ) : (
                upcoming.slice(0, 3).map((item) => (
                  <Pressable
                    key={`${item.kind ?? 'event'}-${item.id}`}
                    onPress={() =>
                      router.push(
                        item.kind === 'special'
                          ? '/special-dates'
                          : { pathname: '/calendar', params: { date: item.date.slice(0, 10) } },
                      )
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`${item.title}, ${item.kind === 'special' ? 'özel günler' : 'takvim'} sayfasını aç`}
                    style={styles.upcomingRow}
                  >
                    <View style={[styles.upcomingIcon, { backgroundColor: calendarColor.tint }]}>
                      <Feather
                        name={item.kind === 'special' ? 'gift' : 'calendar'}
                        size={17}
                        color={calendarColor.color}
                      />
                    </View>
                    <View style={styles.upcomingCopy}>
                      <Text style={styles.upcomingTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.muted} numberOfLines={2}>
                        {item.subtitle}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </Card>
          </>
        );
      case 'mood':
        return (
          <MoodSummaryCard
            today={moods.today}
            partnerToday={moods.partnerToday}
            partnerName={couple.partner?.displayName ?? 'Partneriniz'}
            paired={couple.isPaired}
            loading={moods.loading || couple.loading}
            error={moods.error}
            onPress={() => router.push('/mood')}
          />
        );
      default:
        return null;
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        couple.refresh(),
        refreshNotes(),
        moods.refresh(),
        refreshNotifications(),
        refreshTodaySong(),
        refreshHomePreviews(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const listenToTodaySong = async (url: string) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Bağlantı açılamadı', 'Şarkı bağlantısını kontrol edip yeniden deneyin.');
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
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.82,
        exif: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 8 * 1024 * 1024) {
        Alert.alert('Fotoğraf çok büyük', 'Lütfen 8 MB’tan küçük bir fotoğraf seçin.');
        return;
      }
      setUploadingPhoto(true);
      const mimeType =
        asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
      const file = await readFileBytes(asset.uri);
      if (file.byteLength > 8 * 1024 * 1024)
        throw new Error('Fotoğraf 8 MB’tan büyük. Daha küçük bir fotoğraf seçin.');
      const photoPath = `${couple.couple.id}/photo`;
      const { error: uploadError } = await supabase.storage.from('couple-photos').upload(photoPath, file, {
        contentType: mimeType,
        cacheControl: '0',
        upsert: true,
      });
      if (uploadError) {
        if (
          uploadError.message.toLowerCase().includes('bucket') ||
          uploadError.message.toLowerCase().includes('row-level security')
        ) {
          throw new Error(
            'Fotoğraf yükleme ayarı henüz tamamlanmadı. Supabase SQL Editor’da ortak fotoğraf kurulum SQL’ini çalıştırın.',
          );
        }
        throw new Error(uploadError.message);
      }
      const { error: saveError } = await supabase.rpc('set_couple_photo_path', { p_path: photoPath });
      if (saveError)
        throw new Error(
          'Ortak fotoğraf ayarı Supabase’e eklenmemiş olabilir. Önce ortak fotoğraf SQL kurulumunu çalıştırın.',
        );
      if (couple.partner?.id)
        await notificationService.notifyPartner({
          partnerId: couple.partner.id,
          coupleId: couple.couple.id,
          title: 'Ortak fotoğraf güncellendi',
          body: 'Partneriniz ortak fotoğrafınızı değiştirdi.',
        });
      await couple.refresh();
      Alert.alert('Fotoğraf güncellendi', 'Ortak fotoğrafınız ikinizin ana ekranında görünecek.');
    } catch (error) {
      Alert.alert(
        'Fotoğraf yüklenemedi',
        error instanceof Error ? error.message : 'Bağlantınızı kontrol edip yeniden deneyin.',
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const renderCategorySlug = (slug: string) => {
    if (slug === 'gunun-sarkisi') return renderHomeSection('song');
    if (slug === 'ekrana-not') return renderHomeSection('partner-note');
    if (slug === 'ruh-halim') return renderHomeSection('mood');
    if (slug === 'yaklasanlar') return renderHomeSection('upcoming');
    const category = HOME_CATEGORY_ITEMS.find((item) => item.slug === slug);
    return category ? renderCategoryCard(category) : null;
  };

  const listHeader = (
    <View
      style={[styles.responsiveContent, { maxWidth: landscapeTablet ? 1080 : portraitTablet ? 790 : 650 }]}
    >
      <View style={styles.homeTopBar}>
        <View style={styles.homeTopTitleGroup}>
          <Text style={styles.homeTopTitle} accessibilityRole="header">
            İkimiz
          </Text>
          {couple.couple?.relationshipStartedAt ? (
            <View style={styles.durationTopPill}>
              <TogetherDuration startedAt={couple.couple.relationshipStartedAt} />
            </View>
          ) : null}
        </View>
        <View style={styles.homeTopActions}>
          <Pressable
            onPress={() => void sendKissFromHome()}
            accessibilityRole="button"
            accessibilityLabel="Partnerinize öpücük gönder"
            style={styles.kissTopButton}
            disabled={sendingKiss}
          >
            {sendingKiss ? (
              <ActivityIndicator color={colors.copper} size="small" />
            ) : (
              <Text style={styles.kissTopEmoji}>💋</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => setHomeLayoutVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Ana ekran kartlarını düzenle"
            style={styles.layoutEditButton}
          >
            <Feather name="sliders" size={17} color={colors.text} />
          </Pressable>
        </View>
      </View>
      <DynamicSky
        sideContent={
          couple.isPaired && couple.couple?.id ? (
            <CoupleFlower coupleId={couple.couple.id} partnerId={couple.partner?.id} />
          ) : null
        }
        treeContent={
          couple.isPaired ? (
            <View style={styles.treeControls}>
              <Pressable
                onPress={() => (direction.sharing ? direction.stop() : void direction.start())}
                accessibilityRole="button"
                accessibilityLabel={
                  direction.angle == null
                    ? 'Partner yönünü görmek için konum paylaşımını aç'
                    : 'Partnerin yönünü göster'
                }
                style={styles.directionButton}
              >
                <Feather
                  name="arrow-up"
                  size={27}
                  color={
                    direction.bothSharing && direction.angle != null
                      ? '#159447'
                      : direction.sharing || direction.starting || direction.anySharing
                        ? '#1676E8'
                        : colors.cream
                  }
                  style={
                    direction.bothSharing && direction.angle != null
                      ? { transform: [{ rotate: `${direction.angle}deg` }] }
                      : undefined
                  }
                />
                <Text style={styles.directionLabel}>Aşkım nerdesin?</Text>
              </Pressable>
              <Text style={styles.directionHintOverlay} numberOfLines={1}>
                {direction.error ||
                  (direction.bothSharing
                    ? 'Konumunuz paylaşılıyor.'
                    : direction.sharing
                      ? 'Partnerin de açınca yön görünür.'
                      : direction.anySharing
                        ? 'Sen de açınca yön görünür.'
                        : ' ')}
              </Text>
            </View>
          ) : null
        }
      >
        <View style={styles.header}>
          <View style={styles.identityRow}>
            {couple.couple?.photoUrl ? (
              <Pressable
                onPress={() => setPhotoVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Ortak fotoğrafı görüntüle"
              >
                <Image
                  source={{ uri: couple.couple.photoUrl }}
                  style={styles.couplePhoto}
                  accessibilityLabel="İkinizin ortak fotoğrafı"
                />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setPhotoVisible(true)}
                accessibilityRole="button"
                accessibilityLabel="Ortak fotoğrafı görüntüle veya ekle"
                style={styles.photoPlaceholder}
              >
                <Feather name="users" size={23} color={colors.textSecondary} />
              </Pressable>
            )}
            <View style={styles.identityText}>
              <Text style={styles.subtitle}>
                {greeting(new Date(now))}, {user?.displayName}
              </Text>
              <Text style={styles.dateLabel}>{todayLabel(new Date(now))}</Text>
            </View>
          </View>
        </View>
      </DynamicSky>
      {/* Ana ekranın üstünde tekrarlanan kategori başlığı gösterilmez. */}
    </View>
  );

  return (
    <Screen inTabs scroll={false} contentMaxWidth={homeContentMaxWidth}>
      <FlatList
        key={landscapeTablet ? 'home-tablet-landscape' : 'home-single-column'}
        style={styles.homeList}
        numColumns={landscapeTablet ? 2 : 1}
        columnWrapperStyle={landscapeTablet ? styles.landscapeCategoryRow : undefined}
        data={homeCategoryOrder.filter((slug) => !hiddenHomeCategories.includes(slug))}
        keyExtractor={(slug) => slug}
        renderItem={({ item: slug }) => (
          <View style={[styles.homeCardItem, landscapeTablet && styles.landscapeHomeItem]}>
            {renderCategorySlug(slug)}
          </View>
        )}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.homeListContent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        showsVerticalScrollIndicator={false}
      />
      <Modal
        visible={homeLayoutVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHomeLayoutVisible(false)}
      >
        <View style={styles.layoutBackdrop}>
          <View style={styles.layoutSheet}>
            <View style={styles.layoutHeader}>
              <View>
                <Text style={styles.layoutTitle}>Ana ekranı düzenle</Text>
                <Text style={styles.layoutHint}>Kartları taşıyabilir veya ayrı ayrı gizleyebilirsiniz.</Text>
              </View>
              <Pressable
                onPress={() => setHomeLayoutVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Düzenlemeyi kapat"
                style={styles.layoutClose}
              >
                <Feather name="x" size={20} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.layoutScroll} showsVerticalScrollIndicator={false}>
              {homeCategoryOrder.map((slug, index) => {
                const title =
                  slug === 'gunun-sarkisi'
                    ? 'Günün Şarkısı'
                    : slug === 'ekrana-not'
                      ? 'Partnerinden Not'
                      : slug === 'ruh-halim'
                        ? 'Ruh Halim'
                        : (HOME_CATEGORY_ITEMS.find((item) => item.slug === slug)?.title ?? slug);
                return (
                  <View key={slug} style={styles.layoutCategoryRow}>
                    <Text numberOfLines={1} style={styles.layoutCategoryName}>
                      {title}
                    </Text>
                    <Pressable
                      onPress={() => moveHomeCategory(index, -1)}
                      disabled={index === 0}
                      accessibilityRole="button"
                      accessibilityLabel={`${title} kategorisini yukarı taşı`}
                      style={[styles.layoutIconButton, index === 0 && styles.layoutIconButtonDisabled]}
                    >
                      <Feather name="chevron-up" size={20} color={colors.accent} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveHomeCategory(index, 1)}
                      disabled={index === homeCategoryOrder.length - 1}
                      accessibilityRole="button"
                      accessibilityLabel={`${title} kategorisini aşağı taşı`}
                      style={[
                        styles.layoutIconButton,
                        index === homeCategoryOrder.length - 1 && styles.layoutIconButtonDisabled,
                      ]}
                    >
                      <Feather name="chevron-down" size={20} color={colors.accent} />
                    </Pressable>
                    <Pressable
                      onPress={() => toggleHomeCategory(slug)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        hiddenHomeCategories.includes(slug)
                          ? `${title} kartını göster`
                          : `${title} kartını gizle`
                      }
                      style={styles.layoutIconButton}
                    >
                      <Feather
                        name={hiddenHomeCategories.includes(slug) ? 'eye-off' : 'eye'}
                        size={17}
                        color={colors.accent}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
            <Pressable onPress={() => setHomeLayoutVisible(false)} style={styles.layoutDone}>
              <Text style={styles.layoutDoneText}>Tamam</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal
        visible={photoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoVisible(false)}
      >
        <View style={styles.photoModalBackdrop}>
          <Pressable
            onPress={() => setPhotoVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Fotoğrafı kapat"
            style={styles.photoClose}
          >
            <Feather name="x" size={22} color={colors.white} />
          </Pressable>
          {couple.couple?.photoUrl ? (
            <Image
              source={{ uri: couple.couple.photoUrl }}
              style={[styles.photoModalImage, { width: width * 0.9, height: height * 0.68 }]}
              resizeMode="contain"
              accessibilityLabel="İkinizin ortak fotoğrafı"
            />
          ) : (
            <View style={styles.photoModalPlaceholder}>
              <Feather name="users" size={54} color={colors.white} />
              <Text style={styles.photoModalHint}>Henüz ortak fotoğraf eklenmedi</Text>
            </View>
          )}
          <Button
            title={
              uploadingPhoto
                ? 'Yükleniyor…'
                : couple.couple?.photoPath
                  ? 'Fotoğrafı değiştir'
                  : 'Fotoğraf ekle'
            }
            icon={uploadingPhoto ? undefined : 'image'}
            loading={uploadingPhoto}
            disabled={uploadingPhoto}
            onPress={() => {
              void changeCouplePhoto();
            }}
            style={styles.photoChangeButton}
            toneColor={colors.accent}
          />
        </View>
      </Modal>
      {uploadingPhoto ? (
        <View pointerEvents="none" style={styles.photoUploading}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  responsiveContent: { width: '100%', maxWidth: 650, alignSelf: 'stretch' },
  homeTopBar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  homeTopTitleGroup: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  homeTopActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  kissTopButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  kissTopEmoji: { fontSize: 17, lineHeight: 21 },
  homeTopTitle: { color: colors.text, fontFamily: 'serif', fontSize: fontSize.xxl, fontWeight: '600' },
  durationTopPill: {
    minWidth: 0,
    maxWidth: 250,
    flexShrink: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, minWidth: 0 },
  layoutEditButton: {
    width: 32,
    height: 32,
    flexShrink: 0,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginLeft: spacing.xs,
  },
  homeList: { width: '100%', flex: 1 },
  homeListContent: { width: '100%', paddingBottom: spacing.xxxl },
  homeCardItem: { width: '100%', alignSelf: 'stretch' },
  landscapeCategoryRow: { alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  landscapeHomeItem: { width: '48.5%', alignSelf: 'auto' },
  layoutBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(20,24,22,0.52)',
  },
  layoutSheet: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '82%',
    alignSelf: 'center',
    padding: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  layoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  layoutTitle: { color: colors.text, fontSize: fontSize.lg, fontWeight: '700' },
  layoutHint: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: spacing.xs },
  layoutClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  layoutScroll: { flexShrink: 1 },
  layoutCategoryRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  layoutCategoryName: { flex: 1, color: colors.textSecondary, fontSize: fontSize.sm },
  layoutIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  layoutIconButtonDisabled: { opacity: 0.35 },
  layoutDone: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    borderRadius: radius.control,
    backgroundColor: colors.accent,
  },
  layoutDoneText: { color: colors.white, fontSize: fontSize.md, fontWeight: '700' },
  treeControls: { width: '100%', alignItems: 'center', gap: 1 },
  directionButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: 2,
    borderRadius: 20,
    backgroundColor: 'rgba(41,47,44,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(246,233,215,0.52)',
    transform: [{ translateY: 14 }],
  },
  directionLabel: { color: colors.cream, fontSize: fontSize.sm, fontWeight: '700' },
  directionHintOverlay: {
    width: '100%',
    height: 15,
    lineHeight: 12,
    maxWidth: '100%',
    marginBottom: 3,
    textAlign: 'center',
    color: colors.cream,
    fontSize: 10,
    textShadowColor: 'rgba(8,45,37,0.96)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    transform: [{ translateY: 14 }],
  },
  couplePhoto: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: colors.copper },
  photoPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(41,47,44,0.78)',
    borderWidth: 1.5,
    borderColor: colors.copper,
  },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(8,22,19,0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  photoClose: {
    position: 'absolute',
    top: 52,
    right: spacing.lg,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  photoModalImage: { maxWidth: '100%', borderRadius: radius.card },
  photoModalPlaceholder: { minHeight: 240, alignItems: 'center', justifyContent: 'center' },
  photoModalHint: { marginTop: spacing.md, color: colors.white, fontSize: fontSize.md },
  photoChangeButton: { minWidth: 220, marginTop: spacing.xl },
  photoUploading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: fontSize.sm + 1, color: colors.cream, marginTop: spacing.xs, fontWeight: '500' },
  dateLabel: { fontSize: fontSize.xs + 1, color: 'rgba(246,233,215,0.82)', marginTop: 2 },
  section: { marginBottom: spacing.md },
  compactCard: { paddingVertical: spacing.xs },
  songCard: { paddingBottom: spacing.md },
  songHeading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  songIcon: { width: 40, height: 40, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  songEyebrow: { fontSize: fontSize.sm, fontWeight: '700' },
  songPrompt: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 2 },
  songDetails: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.control,
  },
  songPreviewCopy: { flex: 1, minWidth: 0 },
  songPreviewPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  upcomingRow: {
    paddingVertical: spacing.xs,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  upcomingCompact: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  upcomingIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  upcomingCopy: { flex: 1 },
  upcomingDescription: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 1 },
  upcomingTitle: { fontSize: fontSize.md, color: colors.text, fontWeight: '500' },
  songCardTitle: { fontSize: fontSize.xl, color: colors.text, fontWeight: '700', lineHeight: 24 },
  songCardArtist: {
    color: colors.textSecondary,
    fontSize: fontSize.md,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  richCategoryCard: { paddingVertical: spacing.sm, borderWidth: 1 },
  richCategoryHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  richCategoryPreview: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.control,
    overflow: 'hidden',
  },
  previewCopy: { flex: 1, minWidth: 0, justifyContent: 'center', gap: 4 },
  previewMainText: { fontSize: fontSize.md, fontWeight: '700' },
  previewDetailText: { color: colors.textSecondary, fontSize: fontSize.xs, lineHeight: 16 },
  galleryPreviewStrip: { flex: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'flex-start' },
  galleryPreviewPhoto: {
    width: 58,
    height: 58,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.card,
  },
  richCategoryAction: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    borderRadius: radius.control,
  },
  richCategoryActionText: { color: colors.cream, fontSize: fontSize.sm, fontWeight: '700' },
  homeCategoryIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeCategoryIconImage: { width: 28, height: 28 },
  homeCategoryTitle: { flex: 1, color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  homeCategoryDescription: { color: colors.textSecondary, fontSize: fontSize.xs, marginTop: 3 },
  homeCategoryArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
