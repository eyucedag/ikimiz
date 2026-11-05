import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
import { formatDate } from '@/src/utils/date';

const MAX_PHOTO_SIZE = 15 * 1024 * 1024;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);
type PendingPhoto = { asset: ImagePicker.ImagePickerAsset; takenAt: string };

async function readPhotoBytes(uri: string): Promise<ArrayBuffer> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const clean = base64.replace(/[^A-Za-z0-9+/=]/g, '');
    const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4) - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0));
    let offset = 0;
    for (let i = 0; i < clean.length; i += 4) {
      const a = alphabet.indexOf(clean[i]);
      const b = alphabet.indexOf(clean[i + 1]);
      const c = alphabet.indexOf(clean[i + 2]);
      const d = alphabet.indexOf(clean[i + 3]);
      if (a < 0 || b < 0) continue;
      bytes[offset++] = (a << 2) | (b >> 4);
      if (c >= 0 && clean[i + 2] !== '=') bytes[offset++] = ((b & 15) << 4) | (c >> 2);
      if (d >= 0 && clean[i + 3] !== '=') bytes[offset++] = ((c & 3) << 6) | d;
    }
    return bytes.buffer;
  } catch {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Seçilen fotoğraf telefondan okunamadı. Başka bir fotoğraf deneyin.');
    return response.arrayBuffer();
  }
}

function parseExifDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4]), Number(match[5]), Number(match[6]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export default function GalleryScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const tone = getCategoryColor('galeri');
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [caption, setCaption] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto | null>(null);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [captionDraft, setCaptionDraft] = useState('');
  const [editingCaption, setEditingCaption] = useState(false);
  const [savingCaption, setSavingCaption] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

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

  const choosePhoto = async () => {
    if (!user || !couple.couple || !couple.partner) return;
    try {
      // Android's system photo picker grants access to the chosen image without broad library permission.
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.9, exif: true });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_PHOTO_SIZE) { Alert.alert('Fotoğraf çok büyük', 'En fazla 15 MB boyutunda fotoğraf ekleyebilirsiniz.'); return; }
      const exifDate = asset.exif?.DateTimeOriginal ?? asset.exif?.DateTime;
      let takenAt = parseExifDate(exifDate)?.toISOString();
      if (!takenAt && asset.assetId) {
        try {
          const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
          if (info.creationTime > 0) takenAt = new Date(info.creationTime).toISOString();
        } catch { /* Fall back to current date when Android does not expose asset metadata. */ }
      }
      setCaption('');
      setPendingPhoto({ asset, takenAt: takenAt ?? new Date().toISOString() });
      setError('');
    } catch (e) { Alert.alert('Fotoğraf seçilemedi', e instanceof Error ? e.message : 'Tekrar deneyin.'); }
  };

  const uploadPhoto = async () => {
    if (!user || !couple.couple || !couple.partner || !pendingPhoto) return;
    setUploading(true); setError('');
    try {
      const { asset } = pendingPhoto;
      const content = await readPhotoBytes(asset.uri);
      if (content.byteLength > MAX_PHOTO_SIZE) throw new Error('En fazla 15 MB boyutunda fotoğraf ekleyebilirsiniz.');
      const mimeType = asset.mimeType && MIME_TYPES.has(asset.mimeType) ? asset.mimeType : 'image/jpeg';
      const photo = await galleryService.add({ ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id, caption, takenAt: pendingPhoto.takenAt, mimeType, sizeBytes: content.byteLength, content });
      setPhotos((current) => [photo, ...current]); setCaption(''); setPendingPhoto(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Fotoğraf eklenemedi.'); }
    finally { setUploading(false); }
  };

  const openPhoto = (photo: GalleryPhoto) => {
    setSelected(photo);
    setCaptionDraft(photo.caption ?? '');
    setEditingCaption(false);
  };

  const saveCaption = async () => {
    if (!selected || !couple.partner) return;
    setSavingCaption(true);
    try {
      const updated = await galleryService.updateCaption(selected, captionDraft, couple.partner.id);
      setPhotos((current) => current.map((photo) => photo.id === updated.id ? updated : photo));
      setSelected(updated);
      setEditingCaption(false);
    } catch (e) { Alert.alert('Yazı kaydedilemedi', e instanceof Error ? e.message : 'Tekrar deneyin.'); }
    finally { setSavingCaption(false); }
  };

  const downloadPhoto = async (photo: GalleryPhoto) => {
    setDownloading(true);
    try {
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
        <Button title="Galeriden fotoğraf seç" icon="image" toneColor={tone.color} onPress={() => { void choosePhoto(); }} disabled={uploading} compact />
        <Text style={styles.uploadHint}>En fazla 15 MB · yalnızca ikiniz görebilirsiniz</Text>
      </Card>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Modal visible={!!pendingPhoto} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { if (!uploading) setPendingPhoto(null); }}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.modalClose} onPress={() => { if (!uploading) setPendingPhoto(null); }} accessibilityRole="button" accessibilityLabel="Fotoğraf seçimini kapat"><Feather name="x" size={24} color={colors.white} /></Pressable>
          {pendingPhoto ? <>
            <Image source={{ uri: pendingPhoto.asset.uri }} style={[styles.fullImage, { width: windowWidth - spacing.xl * 2, height: windowHeight * (keyboardVisible ? 0.24 : 0.52) }]} resizeMode="contain" />
            <View style={[styles.captionInputWrap, { width: windowWidth - spacing.xl * 2 }]}>
              <Input label="Fotoğraf alt yazısı" value={caption} onChangeText={setCaption} placeholder="…" compact numberOfLines={1} style={styles.captionInput} />
            </View>
            {error ? <Text style={styles.modalError}>{error}</Text> : null}
            <Button title="Fotoğrafı yükle" icon="upload" toneColor={tone.color} onPress={() => { void uploadPhoto(); }} loading={uploading} disabled={uploading} compact style={styles.downloadButton} />
          </> : null}
        </KeyboardAvoidingView>
      </Modal>
      {photos.length === 0 && !loading ? <Card style={[styles.emptyCard, { borderColor: tone.color }]}><EmptyState compact icon="image" title="Henüz fotoğraf yok" description="İlk sevdiğiniz anıyı ekleyin." toneColor={tone.color} toneTint={tone.tint} /></Card> : null}
      <View style={styles.grid}>{photos.map((photo) => <Card key={photo.id} onPress={() => openPhoto(photo)} accessibilityLabel={`${photo.caption || 'Fotoğraf'} görüntüle`} style={[styles.polaroid, { width: tileWidth, borderColor: tone.color }]}>
        <Image source={{ uri: photo.imageUrl }} style={styles.tileImage} resizeMode="cover" />
        <View style={styles.captionRow}>
          <View style={styles.captionCopy}><Text style={styles.caption} numberOfLines={2}>{photo.caption || 'Birlikte güzel bir an'}</Text><Text style={styles.date}>{formatDate(photo.takenAt)}</Text></View>
          {photo.ownerId === user?.id ? <Pressable onPress={(event) => { event.stopPropagation(); removePhoto(photo); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fotoğrafı kaldır" style={styles.delete}><Feather name="trash-2" size={16} color={colors.error} /></Pressable> : null}
        </View>
      </Card>)}</View>
      <Modal visible={!!selected} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setSelected(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={styles.modalClose} onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Fotoğrafı kapat"><Feather name="x" size={24} color={colors.white} /></Pressable>
          {selected ? <>
            <Image source={{ uri: selected.imageUrl }} style={[styles.fullImage, { width: windowWidth - spacing.xl * 2, height: windowHeight * (keyboardVisible ? 0.2 : editingCaption ? 0.42 : 0.68) }]} resizeMode="contain" accessibilityLabel={selected.caption || 'Galeri fotoğrafı'} />
            {editingCaption ? <View style={[styles.captionInputWrap, { width: windowWidth - spacing.xl * 2 }]}><Input label="Fotoğraf yazısı" value={captionDraft} onChangeText={setCaptionDraft} placeholder="…" compact numberOfLines={1} style={styles.captionInput} /></View> : <Text style={styles.modalCaption}>{selected.caption || 'Birlikte güzel bir an'}</Text>}
            <Text style={styles.modalDate}>{formatDate(selected.takenAt)}</Text>
            {editingCaption ? <View style={styles.editActions}>
              <Button title="Vazgeç" variant="secondary" toneColor={tone.color} onPress={() => { setCaptionDraft(selected.caption ?? ''); setEditingCaption(false); }} compact />
              <Button title="Kaydet" icon="check" toneColor={tone.color} onPress={() => { void saveCaption(); }} loading={savingCaption} disabled={savingCaption} compact />
            </View> : <Pressable onPress={() => { setCaptionDraft(selected.caption ?? ''); setEditingCaption(true); }} accessibilityRole="button" style={styles.editCaption}><Feather name="edit-2" size={15} color={tone.color} /><Text style={[styles.editCaptionText, { color: tone.color }]}>Yazıyı düzenle</Text></Pressable>}
            {!editingCaption ? <Button title="Telefona indir" icon="download" toneColor={tone.color} onPress={() => { void downloadPhoto(selected); }} loading={downloading} compact style={styles.downloadButton} /> : null}
          </> : null}
        </KeyboardAvoidingView>
      </Modal>
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
  addCard: { borderWidth: 1, marginBottom: spacing.md },
  addTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  uploadHint: { color: colors.textTertiary, fontSize: fontSize.xs, textAlign: 'center', marginTop: spacing.sm },
  error: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.md },
  emptyCard: { borderWidth: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  polaroid: { padding: spacing.sm, borderWidth: 1, backgroundColor: '#FFFEFC' },
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
  captionInputWrap: { marginTop: spacing.md },
  captionInput: { width: '100%', height: 48, minHeight: 48, maxHeight: 48, paddingVertical: 0, color: colors.text, textAlignVertical: 'center' },
  modalError: { color: '#FFD3D3', fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  editCaption: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, padding: spacing.xs },
  editCaptionText: { fontSize: fontSize.sm, fontWeight: '600' },
  downloadButton: { minWidth: 190, marginTop: spacing.lg },
});
