import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Badge, Button, Card, Divider, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { formatDate } from '@/src/utils/date';
import { showSoon } from '@/src/utils/soon';
import { supabase } from '@/src/lib/supabase';

interface RowProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value?: string;
  soon?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function SettingsRow({ icon, title, value, soon, disabled, onPress }: RowProps) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]} accessibilityRole="button" accessibilityState={{ disabled: !!disabled }}>
      <Feather name={icon} size={18} color={colors.earth2} style={styles.rowIcon} />
      <Text style={styles.rowTitle}>{title}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {soon ? <Badge label="Yakında" tone="neutral" /> : <Feather name="chevron-right" size={18} color={colors.textTertiary} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, signOut, deleteAccount } = useAuth();
  const couple = useCouple();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setDisplayName(user?.displayName ?? '');
  }, [user]);

  const save = async () => {
    setError('');
    setSaving(true);
    const result = await updateProfile(fullName, displayName);
    setSaving(false);
    if (result.error) setError(result.error);
    else setEditing(false);
  };

  const confirmSignOut = () =>
    Alert.alert('Çıkış yap', 'Hesabınızdan çıkış yapmak istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Çıkış Yap', style: 'destructive', onPress: signOut },
    ]);

  const confirmDelete = () =>
    Alert.alert('Hesabı sil', 'Hesabınız ve size ait tüm veriler kalıcı olarak silinecek. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Hesabı Sil',
        style: 'destructive',
        onPress: async () => {
          const result = await deleteAccount();
          if (result.error) Alert.alert('Silinemedi', result.error);
        },
      },
    ]);

  const chooseCouplePhoto = async () => {
    if (!couple.couple) {
      Alert.alert('Önce eşleşin', 'Ortak fotoğraf eklemek için partnerinizle eşleşmeniz gerekiyor.');
      return;
    }
    try {
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
      const mimeType = asset.mimeType === 'image/png' || asset.mimeType === 'image/webp' ? asset.mimeType : 'image/jpeg';
      const response = await fetch(asset.uri);
      if (!response.ok) throw new Error('Seçilen fotoğraf okunamadı.');
      const file = await response.arrayBuffer();
      if (file.byteLength > 8 * 1024 * 1024) throw new Error('Fotoğraf 8 MB’tan büyük. Daha küçük bir fotoğraf seçin.');

      const photoPath = `${couple.couple.id}/photo`;
      const { error: uploadError } = await supabase.storage.from('couple-photos').upload(photoPath, file, {
        contentType: mimeType,
        cacheControl: '0',
        upsert: true,
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
    } catch (uploadError) {
      Alert.alert('Fotoğraf yüklenemedi', uploadError instanceof Error ? uploadError.message : 'Bağlantınızı kontrol edip yeniden deneyin.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const coupleSummary = couple.partner
    ? `${couple.partner.displayName} ile eşleştiniz`
    : couple.pendingInvitation
      ? 'Davet onay bekliyor'
      : 'Henüz eşleşme yok';

  return (
    <Screen inTabs>
      <Text style={styles.title} accessibilityRole="header">
        Profil
      </Text>

      <Card style={styles.section}>
        {editing ? (
          <>
            <Input label="Ad Soyad" value={fullName} onChangeText={setFullName} />
            <Input label="Görünen ad" value={displayName} onChangeText={setDisplayName} hint="Partnerinize bu ad gösterilir." error={error || undefined} />
            <View style={styles.buttonRow}>
              <Button title="Vazgeç" variant="secondary" onPress={() => setEditing(false)} style={styles.flex} />
              <Button title="Kaydet" onPress={save} loading={saving} style={styles.flex} />
            </View>
          </>
        ) : (
          <View style={styles.profileRow}>
            <View style={styles.flex}>
              <Text style={styles.name}>{user?.fullName}</Text>
              <Text style={styles.meta}>{user?.email}</Text>
              {user?.createdAt ? <Text style={styles.meta}>Üyelik: {formatDate(user.createdAt)}</Text> : null}
            </View>
            <Button title="Düzenle" icon="edit-2" variant="secondary" compact onPress={() => setEditing(true)} />
          </View>
        )}
      </Card>

      <Text style={styles.groupTitle}>Eşleşme</Text>
      <Card style={styles.groupCard}>
        <SettingsRow icon="link" title="Eşleşme durumu" value={coupleSummary} onPress={() => router.push('/couple/status')} />
        <Divider inset={34} />
        <SettingsRow
          icon="image"
          title="Ortak fotoğraf"
          value={uploadingPhoto ? 'Yükleniyor…' : couple.couple?.photoPath ? 'Değiştir' : 'Ekle'}
          disabled={uploadingPhoto}
          onPress={() => { void chooseCouplePhoto(); }}
        />
      </Card>

      <Text style={styles.groupTitle}>Ayarlar</Text>
      <Card style={styles.groupCard}>
        <SettingsRow icon="bell" title="Bildirim tercihleri" soon onPress={() => showSoon('Bildirim tercihleri', 'Push bildirimleri ve sessiz saatler Aşama 2’de eklenecek.')} />
        <Divider inset={34} />
        <SettingsRow icon="globe" title="Dil" value="Türkçe" soon onPress={() => showSoon('Dil seçimi', 'Uygulama şimdilik yalnızca Türkçe olarak sunuluyor.')} />
        <Divider inset={34} />
        <SettingsRow icon="shield" title="Gizlilik ve veriler" soon onPress={() => showSoon('Gizlilik ve veriler', 'Veri dışa aktarma ve gizlilik ayarları Aşama 2’de eklenecek.')} />
      </Card>

      <Text style={styles.groupTitle}>Uygulama</Text>
      <Card style={styles.groupCard}>
        <View style={styles.row}>
          <Feather name="database" size={18} color={colors.earth2} style={styles.rowIcon} />
          <Text style={styles.rowTitle}>Veri kaynağı</Text>
          <Badge label="Supabase" tone="accent" />
        </View>
        <Divider inset={34} />
        <View style={styles.row}>
          <Feather name="info" size={18} color={colors.earth2} style={styles.rowIcon} />
          <Text style={styles.rowTitle}>Sürüm</Text>
          <Text style={styles.rowValue}>{Constants.expoConfig?.version ?? '1.0.0'}</Text>
        </View>
      </Card>

      <Button title="Çıkış Yap" icon="log-out" variant="secondary" onPress={confirmSignOut} style={styles.section} />
      <Button title="Hesabı Sil" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginVertical: spacing.md },
  section: { marginBottom: spacing.lg },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  groupTitle: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.xs },
  groupCard: { paddingVertical: spacing.xs, marginBottom: spacing.lg, borderRadius: radius.card },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, minHeight: 48 },
  rowIcon: { width: 34 },
  rowTitle: { flex: 1, fontSize: fontSize.md, color: colors.text },
  rowValue: { fontSize: fontSize.sm, color: colors.textSecondary, marginRight: spacing.sm, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.55 },
});
