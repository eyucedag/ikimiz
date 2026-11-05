import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Badge, Button, Card, Divider, Input, Screen } from '@/src/components/ui';
import { appBackgroundColors, colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAppAppearance } from '@/src/hooks/useAppAppearance';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';
import { formatDate } from '@/src/utils/date';
import { showSoon } from '@/src/utils/soon';
import { coupleService } from '@/src/services/coupleService';
import { notificationService } from '@/src/services/notificationService';

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
  const appearance = useAppAppearance();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [startedAt, setStartedAt] = useState(new Date());
  const [datePicker, setDatePicker] = useState(false);
  const [timePicker, setTimePicker] = useState(false);
  const [savingStart, setSavingStart] = useState(false);
  const [startError, setStartError] = useState('');
  const [endingCouple, setEndingCouple] = useState(false);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setDisplayName(user?.displayName ?? '');
  }, [user]);

  useEffect(() => {
    if (couple.couple?.relationshipStartedAt) setStartedAt(new Date(couple.couple.relationshipStartedAt));
  }, [couple.couple?.relationshipStartedAt]);

  const save = async () => {
    setError('');
    setSaving(true);
    const result = await updateProfile(fullName, displayName);
    setSaving(false);
    if (result.error) setError(result.error);
    else {
      if (couple.partner?.id && couple.couple?.id && (fullName.trim() !== user?.fullName || displayName.trim() !== user?.displayName)) {
        await notificationService.notifyPartner({ partnerId: couple.partner.id, coupleId: couple.couple.id, title: 'Profil güncellendi', body: 'Partneriniz profil bilgilerini değiştirdi.' });
      }
      setEditing(false);
    }
  };

  const saveRelationshipStart = async () => {
    setStartError('');
    if (startedAt.getTime() > Date.now()) { setStartError('Başlangıç zamanı gelecekte olamaz.'); return; }
    setSavingStart(true);
    const result = await coupleService.setRelationshipStartedAt(startedAt.toISOString());
    setSavingStart(false);
    if (result.error) setStartError('Başlangıç zamanı kaydedilemedi. Supabase kurulum SQL’ini çalıştırın.');
    else {
      if (couple.partner?.id && couple.couple?.id) await notificationService.notifyPartner({
        partnerId: couple.partner.id, coupleId: couple.couple.id, title: 'İlişki tarihi güncellendi', body: 'Partneriniz ilişkinizin başlangıç tarihini değiştirdi.',
      });
      await couple.refresh();
    }
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

  const confirmEndCouple = () => Alert.alert(
    'Partner bağlantısını sonlandır',
    'Ortak alana erişiminiz kapanır. Kişisel verileriniz korunur. Emin misiniz?',
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sonlandır', style: 'destructive', onPress: async () => {
        setEndingCouple(true);
        const result = await couple.endCouple();
        setEndingCouple(false);
        if (result.error) Alert.alert('Sonlandırılamadı', result.error);
      } },
    ],
  );

  return (
    <Screen inTabs>
      <Text style={styles.title} accessibilityRole="header">
        Ayarlar
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

      <Text style={styles.groupTitle}>Partner</Text>
      <Card style={styles.groupCard}>
        {couple.isPaired ? <>
          <View style={styles.row}>
            <Feather name="user" size={18} color={colors.earth2} style={styles.rowIcon} />
            <View style={styles.partnerInfo}>
              <Text style={styles.rowTitle}>{couple.partner?.displayName ?? 'Partneriniz'}</Text>
              {couple.partner?.email ? <Text style={styles.meta}>{couple.partner.email}</Text> : null}
            </View>
          </View>
          <Divider inset={34} />
          <Button title="Partner bağlantısını sonlandır" variant="danger" icon="x-circle" onPress={confirmEndCouple} loading={endingCouple} />
        </> : <SettingsRow icon="user-plus" title={couple.pendingInvitation ? 'Davet kodunu yönet' : 'Partner ekle'} onPress={() => router.push('/couple/invite')} />}
      </Card>

      {couple.isPaired ? <>
        <Text style={styles.groupTitle}>İlişkiniz</Text>
        <Card style={styles.relationshipCard}>
          <Text style={styles.meta}>Başlangıç tarihini ve saatini girin. Bu bilgi ikinizin ana ekranındaki sayaçta görünür.</Text>
          <View style={styles.buttonRow}>
            <Button title={startedAt.toLocaleDateString('tr-TR')} icon="calendar" variant="secondary" onPress={() => setDatePicker(true)} style={styles.flex} />
            <Button title={startedAt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} icon="clock" variant="secondary" onPress={() => setTimePicker(true)} style={styles.flex} />
          </View>
          {datePicker && Platform.OS === 'android' ? <DateTimePicker value={startedAt} mode="date" display="calendar" maximumDate={new Date()} onChange={(_event, date) => { setDatePicker(false); if (date) setStartedAt((old) => { const value = new Date(old); value.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); return value; }); }} /> : null}
          {timePicker && Platform.OS === 'android' ? <DateTimePicker value={startedAt} mode="time" display="clock" onChange={(_event, date) => { setTimePicker(false); if (date) setStartedAt((old) => { const value = new Date(old); value.setHours(date.getHours(), date.getMinutes(), 0, 0); return value; }); }} /> : null}
          <Modal visible={datePicker && Platform.OS === 'ios'} transparent animationType="slide" onRequestClose={() => setDatePicker(false)}>
            <View style={styles.pickerBackdrop}><View style={[styles.pickerSheet, { backgroundColor: appearance.surfaceColor }]}>
              <View style={styles.pickerHeader}><Button title="Vazgeç" variant="ghost" compact onPress={() => setDatePicker(false)} /><Text style={styles.pickerTitle}>Başlangıç tarihi</Text><Button title="Tamam" variant="ghost" compact onPress={() => setDatePicker(false)} /></View>
              <DateTimePicker value={startedAt} mode="date" display="spinner" locale="tr-TR" themeVariant="light" textColor={colors.text} accentColor={colors.accent} maximumDate={new Date()} onChange={(_event, date) => { if (date) setStartedAt((old) => { const value = new Date(old); value.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); return value; }); }} />
            </View></View>
          </Modal>
          <Modal visible={timePicker && Platform.OS === 'ios'} transparent animationType="slide" onRequestClose={() => setTimePicker(false)}>
            <View style={styles.pickerBackdrop}><View style={[styles.pickerSheet, { backgroundColor: appearance.surfaceColor }]}>
              <View style={styles.pickerHeader}><Button title="Vazgeç" variant="ghost" compact onPress={() => setTimePicker(false)} /><Text style={styles.pickerTitle}>Başlangıç saati</Text><Button title="Tamam" variant="ghost" compact onPress={() => setTimePicker(false)} /></View>
              <DateTimePicker value={startedAt} mode="time" display="spinner" locale="tr-TR" themeVariant="light" textColor={colors.text} accentColor={colors.accent} onChange={(_event, date) => { if (date) setStartedAt((old) => { const value = new Date(old); value.setHours(date.getHours(), date.getMinutes(), 0, 0); return value; }); }} />
            </View></View>
          </Modal>
          {startError ? <Text style={styles.inlineError}>{startError}</Text> : null}
          <Button title="İlişki başlangıcını kaydet" icon="save" loading={savingStart} onPress={() => { void saveRelationshipStart(); }} style={styles.saveStart} />
        </Card>
      </> : null}

      <Text style={styles.groupTitle}>Tercihler</Text>
      <Card style={styles.groupCard}>
        <Text style={styles.themeTitle}>Uygulama arka planı</Text>
        <Text style={styles.themeHint}>Açık alanların rengini seçin.</Text>
        <View style={styles.backgroundOptions}>
          {appBackgroundColors.map((option) => <Pressable key={option.color} onPress={() => appearance.setBackgroundColor(option.color)} accessibilityRole="button" accessibilityLabel={`${option.label} arka plan`} accessibilityState={{ selected: appearance.backgroundColor === option.color }} style={[styles.backgroundOption, { backgroundColor: option.color, borderColor: appearance.backgroundColor === option.color ? colors.accent : colors.border }]}>
            {appearance.backgroundColor === option.color ? <Feather name="check" size={16} color={colors.accent} /> : null}
          </Pressable>)}
        </View>
        <Divider inset={34} />
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
  section: { marginBottom: spacing.md },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  buttonRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  groupTitle: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textTertiary, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.xs },
  groupCard: { paddingVertical: spacing.xs, marginBottom: spacing.md, borderRadius: radius.card },
  themeTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text, marginHorizontal: spacing.sm },
  themeHint: { fontSize: fontSize.xs, color: colors.textSecondary, marginHorizontal: spacing.sm, marginTop: 2, marginBottom: spacing.sm },
  backgroundOptions: { flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'space-between', paddingHorizontal: spacing.sm, marginBottom: spacing.sm },
  backgroundOption: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  relationshipCard: { paddingVertical: spacing.md, marginBottom: spacing.md, borderRadius: radius.card },
  inlineError: { color: colors.error, fontSize: fontSize.sm, marginTop: spacing.sm },
  saveStart: { marginTop: spacing.md },
  pickerBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  pickerSheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, paddingBottom: spacing.xl },
  pickerHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: spacing.sm },
  pickerTitle: { color: colors.text, fontSize: fontSize.md, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, minHeight: 48 },
  rowIcon: { width: 34 },
  rowTitle: { flex: 1, fontSize: fontSize.md, color: colors.text },
  rowValue: { fontSize: fontSize.sm, color: colors.textSecondary, marginRight: spacing.sm, flexShrink: 1 },
  partnerInfo: { flex: 1 },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.55 },
});
