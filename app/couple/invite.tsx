import React, { useState } from 'react';
import { Alert, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Card, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { useCouple } from '@/src/hooks/useCouple';

export default function InviteScreen() {
  const router = useRouter();
  const { isMockMode } = useAuth();
  const couple = useCouple();
  const [busy, setBusy] = useState<'create' | 'cancel' | 'simulate' | null>(null);
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

  const simulate = async () => {
    const result = await run('simulate', couple.simulatePartnerAccept);
    if (!result.error) router.replace('/couple/status');
  };

  if (couple.isPaired) {
    return (
      <Screen title="Partner Davet Et">
        <EmptyState
          icon="check-circle"
          title="Zaten eşleştiniz"
          description={`${couple.partner?.displayName ?? 'Partneriniz'} ile ortak alanınız aktif.`}
          actionLabel="Eşleşme durumunu gör"
          onAction={() => router.replace('/couple/status')}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Partner Davet Et">
      {invitation ? (
        <>
          <Text style={styles.lead}>Bu kodu partnerinize iletin. Partneriniz uygulamada “Kodum Var” bölümüne kodu girdiğinde eşleşmeniz tamamlanır.</Text>
          <Card style={styles.codeCard}>
            <Text style={styles.codeLabel}>Davet kodunuz</Text>
            <View style={styles.codeRow} accessibilityLabel={`Davet kodu ${invitation.code.split('').join(' ')}`}>
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
          <Button title="Daveti İptal Et" variant="ghost" loading={busy === 'cancel'} onPress={() => run('cancel', couple.cancelInvitation)} style={styles.gap} />

          {isMockMode ? (
            <Card style={styles.demoCard}>
              <Text style={styles.demoTitle}>Demo mod</Text>
              <Text style={styles.demoText}>
                Tek cihazda deneme yapıyorsanız, “Deniz” adlı demo partnerin bu daveti kabul etmesini simüle edebilirsiniz.
              </Text>
              <Button title="Partner Kabulünü Simüle Et" variant="secondary" compact loading={busy === 'simulate'} onPress={simulate} />
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <EmptyState
            icon="send"
            title="Partnerinizi davet edin"
            description="6 haneli bir davet kodu oluşturun ve partnerinizle paylaşın. Kod ile eşleştiğinizde ortak alanınız açılır."
          />
          <Button title="Davet Kodu Oluştur" icon="plus" loading={busy === 'create'} onPress={() => run('create', couple.createInvitation)} />
          <Button title="Bana kod verildi" variant="ghost" onPress={() => router.replace('/couple/accept')} style={styles.gap} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  codeCard: { alignItems: 'center', marginBottom: spacing.xl, paddingVertical: spacing.xxl },
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
  demoCard: { marginTop: spacing.xxl, backgroundColor: colors.beige, borderColor: colors.beige },
  demoTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.earth2, marginBottom: spacing.xs },
  demoText: { fontSize: fontSize.sm, color: colors.textSecondary, lineHeight: 19, marginBottom: spacing.md },
});
