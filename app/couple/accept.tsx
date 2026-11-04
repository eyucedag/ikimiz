import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useCouple } from '@/src/hooks/useCouple';

export default function AcceptInvitationScreen() {
  const router = useRouter();
  const couple = useCouple();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);

  const onChange = (value: string) => setCode(value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6));

  const accept = async () => {
    setError('');
    setBusy('accept');
    const result = await couple.acceptInvitation(code);
    setBusy(null);
    if (result.error) setError(result.error);
    else Alert.alert('Eşleşme tamamlandı', 'Ortak alanınız artık hazır.', [{ text: 'Harika', onPress: () => router.replace('/(tabs)') }]);
  };

  const reject = () =>
    Alert.alert('Daveti reddet', 'Bu daveti reddetmek istediğinize emin misiniz? Davet eden kişi bilgilendirilir.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Reddet',
        style: 'destructive',
        onPress: async () => {
          setBusy('reject');
          const result = await couple.rejectInvitation(code);
          setBusy(null);
          if (result.error) setError(result.error);
          else {
            setCode('');
            Alert.alert('Davet reddedildi');
          }
        },
      },
    ]);

  if (couple.isPaired) {
    return (
      <Screen title="Daveti Kabul Et">
        <EmptyState
          icon="check-circle"
          title="Zaten eşleştiniz"
          description="Yeni bir daveti kabul etmek için önce mevcut eşleşmeyi sonlandırmanız gerekir."
          actionLabel="Eşleşme durumunu gör"
          onAction={() => router.replace('/couple/status')}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Daveti Kabul Et">
      <Text style={styles.lead}>Partnerinizin size ilettiği 6 haneli davet kodunu girin.</Text>
      <Input
        label="Davet kodu"
        value={code}
        onChangeText={onChange}
        placeholder="ÖRN. K7M2QX"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        style={styles.codeInput}
        error={error || undefined}
        onSubmitEditing={accept}
      />
      <Button title="Kabul Et ve Eşleş" icon="check" onPress={accept} loading={busy === 'accept'} disabled={code.length !== 6} />
      <Button title="Daveti Reddet" variant="ghost" onPress={reject} loading={busy === 'reject'} disabled={code.length !== 6} style={styles.gap} />
      <Button title="Bunun yerine ben davet edeyim" variant="secondary" onPress={() => router.replace('/couple/invite')} style={styles.gapLarge} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: fontSize.md, color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.xl },
  codeInput: { fontSize: fontSize.xxl, letterSpacing: 6, textAlign: 'center', fontWeight: '700' },
  gap: { marginTop: spacing.md },
  gapLarge: { marginTop: spacing.xxl },
});
