import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Input, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { CoupleDocument, documentService } from '@/src/services/documentService';
import { formatDateTime } from '@/src/utils/date';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const allowedExtensions = new Set(['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif']);
const mimeByExtension: Record<string, string> = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', gif: 'image/gif',
};

const extension = (name: string) => name.split('.').pop()?.toLowerCase() ?? '';
const sizeLabel = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export default function DocumentsScreen() {
  const { user } = useAuth();
  const couple = useCouple();
  const tone = getCategoryColor('onemli-belgeler');
  const [documents, setDocuments] = useState<CoupleDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [displayName, setDisplayName] = useState('');

  const refresh = useCallback(async (showLoading = true) => {
    if (!couple.couple?.id) return;
    if (showLoading) setLoading(true);
    try { setDocuments(await documentService.list(couple.couple.id)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Belgeler yüklenemedi.'); }
    finally { if (showLoading) setLoading(false); }
  }, [couple.couple?.id]);

  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => { void refresh(false); }, 7000);
    return () => clearInterval(timer);
  }, [refresh]));

  const upload = async (file: { uri: string; name: string; mimeType?: string | null; size?: number | null }) => {
    if (!user || !couple.couple || !couple.partner) return;
    if (!displayName.trim()) { Alert.alert('Görünen ad gerekli', 'Belge için ikinizin göreceği adı önce yazın.'); return; }
    const ext = extension(file.name);
    if (!allowedExtensions.has(ext)) {
      Alert.alert('Dosya türü desteklenmiyor', 'Word, PDF, JPG, PNG, WEBP, HEIC veya GIF dosyası seçin.');
      return;
    }
    if (file.size && file.size > MAX_FILE_SIZE) {
      Alert.alert('Dosya çok büyük', 'En fazla 25 MB boyutunda dosya ekleyebilirsiniz.');
      return;
    }
    setUploading(true); setError('');
    try {
      const response = await fetch(file.uri);
      if (!response.ok) throw new Error('Seçilen dosya okunamadı.');
      const content = await response.arrayBuffer();
      if (content.byteLength > MAX_FILE_SIZE) throw new Error('En fazla 25 MB boyutunda dosya ekleyebilirsiniz.');
      const mimeType = mimeByExtension[ext] ?? file.mimeType ?? 'application/octet-stream';
      const saved = await documentService.add({
        ownerId: user.id, partnerId: couple.partner.id, coupleId: couple.couple.id,
        fileName: file.name, displayName: displayName.trim(), mimeType, sizeBytes: content.byteLength, content,
      });
      setDocuments((current) => [saved, ...current]);
      setDisplayName('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Dosya eklenemedi.'); }
    finally { setUploading(false); }
  };

  const chooseDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        await upload({ uri: file.uri, name: file.name, mimeType: file.mimeType, size: file.size });
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Dosya seçilemedi.'); }
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { Alert.alert('Fotoğraf erişimi gerekli', 'Belge eklemek için fotoğraf arşivine erişim izni verin.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false, quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const image = result.assets[0];
    const name = image.fileName || `fotoğraf.${extension(image.uri) || 'jpg'}`;
    await upload({ uri: image.uri, name, mimeType: image.mimeType, size: image.fileSize });
  };

  const open = async (document: CoupleDocument) => {
    try { await Linking.openURL(await documentService.openUrl(document.storagePath)); }
    catch (e) { Alert.alert('Belge açılamadı', e instanceof Error ? e.message : 'Bağlantınızı kontrol edin.'); }
  };

  const remove = (document: CoupleDocument) => Alert.alert('Belgeyi kaldır', `${document.fileName} ortak alandan kaldırılsın mı?`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: async () => {
      try { await documentService.remove(document); setDocuments((current) => current.filter((item) => item.id !== document.id)); }
      catch (e) { setError(e instanceof Error ? e.message : 'Belge kaldırılamadı.'); }
    } },
  ]);

  const onRefresh = async () => { setRefreshing(true); try { await refresh(false); } finally { setRefreshing(false); } };

  if (couple.loading) return <Screen title="Önemli Belgeler"><CoupleLoading /></Screen>;
  return <Screen title="Önemli Belgeler" refreshing={refreshing || loading} onRefresh={() => { void onRefresh(); }}>
    {!couple.isPaired || !couple.couple ? <EmptyState icon="users" title="Önce eşleşin" description="Ortak belgeleri kullanmak için partnerinizle eşleşin." /> : <>
      <Text style={styles.intro}>Belgeleriniz yalnızca ikinizin erişebildiği ortak alanda saklanır. Tek dosya en fazla 25 MB olabilir.</Text>
      <Input label="Görünen ad" value={displayName} onChangeText={setDisplayName} placeholder="…" compact />
      <View style={styles.actions}>
        <Button title="Word veya PDF ekle" icon="file-plus" toneColor={tone.color} onPress={() => { void chooseDocument(); }} loading={uploading} disabled={uploading || !displayName.trim()} compact style={styles.actionButton} />
        <Button title="Fotoğraf ekle" icon="image" variant="secondary" toneColor={tone.color} onPress={() => { void choosePhoto(); }} disabled={uploading || !displayName.trim()} compact style={styles.actionButton} />
      </View>
      {uploading ? <View style={styles.uploading}><ActivityIndicator color={tone.color} /><Text style={styles.meta}>Dosya yükleniyor…</Text></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {documents.length === 0 && !loading ? <Card style={[styles.empty, { borderColor: tone.color }]}>
        <EmptyState compact icon="folder" title="Henüz belge yok" description="Word veya PDF dosyası ya da fotoğraf ekleyin." toneColor={tone.color} toneTint={tone.tint} />
      </Card> : documents.map((document) => {
        const isImage = document.mimeType.startsWith('image/');
        const isPdf = document.mimeType === 'application/pdf';
        const docLabel = isPdf ? 'PDF' : 'DOC';
        return <Card key={document.id} style={[styles.fileCard, { borderColor: tone.color }]}>
          <Pressable onPress={() => { void open(document); }} accessibilityRole="button" accessibilityLabel={`${document.displayName} belgesini aç`} style={styles.fileRow}>
            {isImage && document.previewUrl ? <Image source={{ uri: document.previewUrl }} style={styles.preview} resizeMode="cover" /> : <View style={[styles.preview, styles.docPreview, { backgroundColor: tone.tint }]}><Feather name={isImage ? 'image' : 'file-text'} size={18} color={tone.color} />{!isImage ? <Text style={[styles.docLabel, { color: tone.color }]}>{docLabel}</Text> : null}</View>}
            <View style={styles.fileCopy}>
              <Text style={styles.fileName} numberOfLines={2}>{document.displayName}</Text>
              <Text style={styles.meta}>{sizeLabel(document.sizeBytes)} · {formatDateTime(document.createdAt)}</Text>
            </View>
            <Feather name="download" size={18} color={tone.color} />
          </Pressable>
          {document.ownerId === user?.id ? <Pressable onPress={() => remove(document)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${document.displayName} dosyasını kaldır`} style={styles.delete}>
            <Feather name="trash-2" size={15} color={colors.error} />
          </Pressable> : null}
        </Card>;
      })}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  intro: { color: colors.textSecondary, fontSize: fontSize.sm, lineHeight: 20, marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginBottom: spacing.md },
  actionButton: { width: '100%' },
  uploading: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
  error: { color: colors.error, fontSize: fontSize.sm, marginBottom: spacing.sm },
  empty: { borderWidth: 1.5 },
  fileCard: { borderWidth: 1.5, padding: spacing.md, marginBottom: spacing.sm },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  preview: { width: 52, height: 52, borderRadius: radius.control },
  docPreview: { alignItems: 'center', justifyContent: 'center' },
  docLabel: { fontSize: 8, fontWeight: '800', marginTop: 1 },
  fileCopy: { flex: 1 },
  fileName: { color: colors.text, fontSize: fontSize.sm, fontWeight: '700' },
  meta: { color: colors.textTertiary, fontSize: fontSize.xs, marginTop: 3 },
  delete: { alignSelf: 'flex-end', padding: spacing.xs, marginTop: spacing.xs },
});
