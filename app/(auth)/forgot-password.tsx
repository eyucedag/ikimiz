import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, EmptyState, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    const result = await resetPassword(email);
    setLoading(false);
    if (result.error) setError(result.error);
    else setSent(true);
  };

  if (sent) {
    return (
      <Screen title="Şifre Sıfırlama">
        <EmptyState
          icon="mail"
          title="Bağlantı gönderildi"
          description={`${email.trim()} adresine şifre sıfırlama bağlantısı gönderdik. Gelen kutunuzu kontrol edin.`}
          actionLabel="Girişe dön"
          onAction={() => router.replace('/(auth)/login')}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Şifre Sıfırlama">
      <Text style={styles.lead}>
        Hesabınıza ait e-posta adresini girin; size şifrenizi yenilemeniz için bir bağlantı gönderelim.
      </Text>
      <Input
        label="E-posta"
        value={email}
        onChangeText={setEmail}
        placeholder="…"
        keyboardType="email-address"
        autoCapitalize="none"
        error={error || undefined}
        onSubmitEditing={submit}
      />
      <Button title="Bağlantı Gönder" onPress={submit} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xxl, lineHeight: 22 },
});
