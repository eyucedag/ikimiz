import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordAgain, setPasswordAgain] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    if (password !== passwordAgain) {
      setError('Şifreler birbiriyle eşleşmiyor.');
      return;
    }
    setLoading(true);
    const result = await signUp(fullName, email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data === null) {
      Alert.alert('E-postanızı doğrulayın', 'Hesabınızı etkinleştirmek için e-posta adresinize gönderilen bağlantıya tıklayın.', [
        { text: 'Tamam', onPress: () => router.replace('/(auth)/login') },
      ]);
    }
  };

  return (
    <Screen title="Hesap Oluştur">
      <Text style={styles.lead}>Birkaç bilgiyle hesabınızı oluşturun, ardından partnerinizi davet edin.</Text>
      <Input label="Ad Soyad" value={fullName} onChangeText={setFullName} placeholder="…" autoComplete="name" />
      <Input
        label="E-posta"
        value={email}
        onChangeText={setEmail}
        placeholder="…"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Input label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" secureTextEntry />
      <Input
        label="Şifre (tekrar)"
        value={passwordAgain}
        onChangeText={setPasswordAgain}
        placeholder="Şifrenizi tekrar girin"
        secureTextEntry
        error={error || undefined}
        onSubmitEditing={submit}
      />
      <Button title="Hesap Oluştur" onPress={submit} loading={loading} />
      <View style={styles.footer}>
        <Text style={styles.footerText}>Zaten hesabınız var mı? </Text>
        <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
          <Text style={styles.link}>Giriş yapın</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xxl, lineHeight: 22 },
  link: { color: colors.accent, fontWeight: '600', fontSize: fontSize.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  footerText: { color: colors.textSecondary, fontSize: fontSize.sm },
});
