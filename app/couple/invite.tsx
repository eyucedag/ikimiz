import { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useCouple } from '@/src/hooks/useCouple';

export default function InviteScreen() {
  const router = useRouter();
  const couple = useCouple();
  const [busy, setBusy] = useState<'create' | 'cancel' | null>(null);
  const invitation = couple.pendingInvitation;

  const run = async (key: NonNullable<typeof busy>, action: () => Promise<{ error?: string }>) => {
    setBusy(key);
    const result = await action();
    setBusy(null);
    if (result.error) Alert.alert('İşlem tamamlanamadı', result.error);
    return result;
  };

  const share = async () => {
    if (!invitation) return;
    try {
      await Share.share({
        message: `İkimiz uygulamasında ortak alanımızı kuralım. Uygulamada "Kodum Var" bölümüne şu davet kodunu gir: ${invitation.code}`,
      });
    } catch {
      Alert.alert('Paylaşılamadı', 'Kodu elle iletebilirsiniz.');
    }
  };

  if (couple.isPaired) {
    return (
      <Screen title="Partner Davet Et">
        <EmptyState
          icon="check-circle"
          title="Partneriniz eklendi"
          description={`${couple.partner?.displayName ?? 'Partneriniz'} ile ortak alanınız aktif.`}
          actionLabel="Partner ayarlarını aç"
          onAction={() => router.replace('/couple/status')}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Partner Davet Et">
      {invitation ? (
        <>
          <Text style={styles.lead}>
            Bu kodu partnerinize iletin. Partneriniz uygulamada “Kodum Var” bölümüne kodu girdiğinde
            eşleşmeniz tamamlanır.
          </Text>
          <Card style={styles.codeCard}>
            <Text style={styles.codeLabel}>Davet kodunuz</Text>
            <View
              style={styles.codeRow}
              accessibilityLabel={`Davet kodu ${invitation.code.split('').join(' ')}`}
            >
              {invitation.code.split('').map((ch, i) => (
                <View key={`${ch}-${i}`} style={styles.codeCell}>
                  <Text style={styles.codeChar}>{ch}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.codeHint}>Partneriniz kabul edene kadar geçerlidir.</Text>
          </Card>
          <Button title="Kodu Paylaş" icon="share" onPress={share} />
          <Button
            title="Yeni Kod Oluştur"
            variant="secondary"
            icon="refresh-cw"
            loading={busy === 'create'}
            onPress={() => run('create', couple.createInvitation)}
            style={styles.gap}
          />
          <Button
            title="Daveti İptal Et"
            variant="ghost"
            loading={busy === 'cancel'}
            onPress={() => run('cancel', couple.cancelInvitation)}
            style={styles.gap}
          />
        </>
      ) : (
        <>
          <EmptyState
            icon="send"
            title="Partnerinizi davet edin"
            description="6 haneli bir davet kodu oluşturun ve partnerinizle paylaşın. Kod ile eşleştiğinizde ortak alanınız açılır."
          />
          <Button
            title="Davet Kodu Oluştur"
            icon="plus"
            loading={busy === 'create'}
            onPress={() => run('create', couple.createInvitation)}
          />
          <Button
            title="Bana kod verildi"
            variant="ghost"
            onPress={() => router.replace('/couple/accept')}
            style={styles.gap}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  codeCard: { alignItems: 'center', marginBottom: spacing.md, paddingVertical: spacing.xxl },
  codeLabel: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },
  codeRow: { flexDirection: 'row', gap: spacing.sm },
  codeCell: {
    width: 42,
    height: 52,
    borderRadius: radius.control,
    backgroundColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeChar: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  codeHint: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.md },
  gap: { marginTop: spacing.md },
});
