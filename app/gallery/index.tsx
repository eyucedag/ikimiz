import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, layout, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { GalleryPhoto, galleryService } from '@/src/services/galleryService';
import { formatDateTime } from '@/src/utils/date';

const MAX_PHOTO_SIZE = 15 * 1024 * 1024;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

export default function GalleryScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const tone = getCategoryColor('galeri');
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async (showLoading = true) => {
    if (!couple.couple?.id) return;
    if (showLoading) setLoading(true);
    try { setPhotos(await galleryService.list(couple.couple.id)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Galeri yüklenemedi.'); }
    finally { if (showLoading) setLoading(false); }
  }, [couple.couple?.id]);

  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => { void refresh(false); }, 10000);
    return () => clearInterval(timer);
  }, [refresh]));

  const addPhoto = async () => {
    if (!user || !couple.couple || !couple.partner) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Fotoğraf erişimi gerekli', 'Galeriye fotoğraf eklemek için fotoğraf arşivine erişim izni verin.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9, exif: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_PHOTO_SIZE) { Alert.alert('Fotoğraf çok büyük', 'En fazla 15 MB boyutunda fotoğraf ekleyebilirsiniz.'); return; }
    setUploading(true); setError('');
    try {
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Seçilen fotoğraf okunamadı.');
      const content = await response.arrayBuffer();
      if (content.byteLength > MAX_PHOTO_SIZE) throw new Error('En fazla 15 MB boyutunda fotoğraf ekleyebilirsiniz.');
      const mimeType = asset.mimeType && MIME_TYPES.has(asset.mimeType) ? asset.mimeType : 'image/jpeg';
      const photo = await galleryService.add({ ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id, caption, mimeType, sizeBytes: content.byteLength, content });
      setPhotos((current) => [photo, ...current]); setCaption('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Fotoğraf eklenemedi.'); }
    finally { setUploading(false); }
  };

  const downloadPhoto = async (photo: GalleryPhoto) => {
    setDownloading(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!permission.granted) { Alert.alert('Fotoğraf kaydetme izni gerekli', 'Fotoğrafı telefona indirmek için fotoğraf arşivine kaydetme izni verin.'); return; }
      if (!FileSystem.cacheDirectory) throw new Error('Geçici indirme alanı açılamadı.');
      const extension = photo.mimeType === 'image/png' ? 'png' : photo.mimeType === 'image/webp' ? 'webp' : photo.mimeType === 'image/heic' ? 'heic' : 'jpg';
      const target = `${FileSystem.cacheDirectory}ikimiz-galeri-${photo.id}.${extension}`;
      const downloaded = await FileSystem.downloadAsync(photo.imageUrl, target);
      await MediaLibrary.saveToLibraryAsync(downloaded.uri);
      Alert.alert('Fotoğraf indirildi', 'Fotoğraf telefonunuzun fotoğraf arşivine kaydedildi.');
    } catch (e) { Alert.alert('Fotoğraf indirilemedi', e instanceof Error ? e.message : 'Bağlantınızı kontrol edip yeniden deneyin.'); }
    finally { setDownloading(false); }
  };

  const removePhoto = (photo: GalleryPhoto) => Alert.alert('Fotoğrafı kaldır', `${photo.caption || 'Bu fotoğraf'} ortak galeriden kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await galleryService.remove(photo); setPhotos((current) => current.filter((item) => item.id !== photo.id)); if (selected?.id === photo.id) setSelected(null); }
      catch (e) { setError(e instanceof Error ? e.message : 'Fotoğraf kaldırılamadı.'); }
    } },
  ]);

  if (couple.loading) return <Screen title="Galeri"><CoupleLoading /></Screen>;
  const gridWidth = Math.min(windowWidth, layout.maxContentWidth) - spacing.lg * 2;
  const tileWidth = (gridWidth - spacing.sm) / 2;

  return <Screen title="Galeri" refreshing={loading} onRefresh={() => { void refresh(); }}>
    {!couple.couple ? <EmptyState icon="users" title="Önce eşleşin" description="Ortak fotoğraf galerisi partnerinizle eşleşince kullanılabilir." toneColor={tone.color} toneTint={tone.tint} /> : <>
      <Text style={styles.intro}>En sevdiğiniz fotoğrafları polaroid kartlarda birlikte biriktirin.</Text>
      <Card style={[styles.addCard, { borderColor: tone.color }]}>
        <Text style={[styles.addTitle, { color: tone.color }]}>Yeni fotoğraf</Text>
        <Input label="Fotoğraf alt yazısı" value={caption} onChangeText={setCaption} placeholder="…" compact />
        <Button title="Galeriden fotoğraf seç" icon="image" toneColor={tone.color} onPress={() => { void addPhoto(); }} loading={uploading} disabled={uploading} compact />
        <Text style={styles.uploadHint}>En fazla 15 MB · yalnızca ikiniz görebilirsiniz</Text>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {photos.length === 0 && !loading ? <Card style={[styles.emptyCard, { borderColor: tone.color }]}><EmptyState compact icon="image" title="Henüz fotoğraf yok" description="İlk sevdiğiniz anıyı ekleyin." toneColor={tone.color} toneTint={tone.tint} /></Card> : null}
      <View style={styles.grid}>{photos.map((photo) => <Card key={photo.id} onPress={() => setSelected(photo)} accessibilityLabel={`${photo.caption || 'Fotoğraf'} görüntüle`} style={[styles.polaroid, { width: tileWidth, borderColor: tone.color }]}>
        <Image source={{ uri: photo.imageUrl }} style={styles.tileImage} resizeMode="cover" />
        <View style={styles.captionRow}>
          <View style={styles.captionCopy}><Text style={styles.caption} numberOfLines={2}>{photo.caption || 'Birlikte güzel bir an'}</Text><Text style={styles.date}>{formatDateTime(photo.createdAt)}</Text></View>
          {photo.ownerId === user?.id ? <Pressable onPress={(event) => { event.stopPropagation(); removePhoto(photo); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fotoğrafı kaldır" style={styles.delete}><Feather name="trash-2" size={16} color={colors.error} /></Pressable> : null}
        </View>
      </Card>)}</View>
      <Modal visible={!!selected} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={styles.modalClose} onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Fotoğrafı kapat"><Feather name="x" size={24} color={colors.white} /></Pressable>
          {selected ? <>
            <Image source={{ uri: selected.imageUrl }} style={[styles.fullImage, { width: windowWidth - spacing.xl * 2, height: windowHeight * 0.68 }]} resizeMode="contain" accessibilityLabel={selected.caption || 'Galeri fotoğrafı'} />
            <Text style={styles.modalCaption}>{selected.caption || 'Birlikte güzel bir an'}</Text>
            <Text style={styles.modalDate}>{formatDateTime(selected.createdAt)}</Text>
            <Button title="Telefona indir" icon="download" toneColor={tone.color} onPress={() => { void downloadPhoto(selected); }} loading={downloading} compact style={styles.downloadButton} />
          </> : null}
        </View>
      </Modal>
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
  addCard: { borderWidth: 1.5, marginBottom: spacing.md },
  addTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  uploadHint: { color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.sm },
  error: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.md },
  emptyCard: { borderWidth: 1.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  polaroid: { padding: spacing.sm, borderWidth: 1.5, backgroundColor: '#FFFEFC' },
  tileImage: { width: '100%', aspectRatio: 1, backgroundColor: colors.beige },
  captionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: 44, paddingTop: spacing.sm },
  captionCopy: { flex: 1, minWidth: 0 },
  caption: { color: colors.text, fontSize: fontSize.xs, fontWeight: '600' },
  date: { color: colors.textTertiary, fontSize: 9, marginTop: 3 },
  delete: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,18,20,0.96)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalClose: { position: 'absolute', top: 56, right: spacing.lg, zIndex: 1, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  fullImage: { maxWidth: '100%' },
  modalCaption: { color: colors.white, fontWeight: '700', fontSize: fontSize.md, marginTop: spacing.md, textAlign: 'center' },
  modalDate: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.xs, marginTop: spacing.xs },
  downloadButton: { minWidth: 190, marginTop: spacing.lg },
});
