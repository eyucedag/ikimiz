import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Divider, Input, Screen } from '@/src/components/ui';
import { colors, fontSize, spacing } from '@/src/constants/theme';
import { useAuth } from '@/src/hooks/useAuth';
import { showSocialSoon } from '@/src/utils/soon';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signInAsTestUser, isMockMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = async () => {
    setError('');
    setLoading(true);
    const result = await signIn(email, password);
    setLoading(false);
    if (result.error) setError(result.error);
  };

  const continueAsTest = async () => {
    setLoading(true);
    const result = await signInAsTestUser();
    setLoading(false);
    if (result.error) setError(result.error);
  };

  return (
    <Screen title="Giriş Yap">
      <Text style={styles.lead}>Tekrar hoş geldiniz. E-posta adresiniz ve şifrenizle giriş yapın.</Text>
      <Input
        label="E-posta"
        value={email}
        onChangeText={setEmail}
        placeholder="ornek@eposta.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <Input
        ref={passwordRef}
        label="Şifre"
        value={password}
        onChangeText={setPassword}
        placeholder="Şifreniz"
        secureTextEntry
        autoComplete="password"
        returnKeyType="go"
        onSubmitEditing={submit}
        error={error || undefined}
      />
      <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgot} hitSlop={8}>
        <Text style={styles.link}>Şifremi unuttum</Text>
      </Pressable>

      <Button title="Giriş Yap" onPress={submit} loading={loading} />
      {isMockMode ? (
        <Button title="Test Kullanıcısı ile Devam Et" variant="ghost" icon="play" onPress={continueAsTest} style={styles.gap} />
      ) : null}

      <Divider spaced />
      <Button title="Google ile devam et" icon="globe" variant="secondary" onPress={() => showSocialSoon('Google')} />
      <Button title="Apple ile devam et" icon="smartphone" variant="secondary" onPress={() => showSocialSoon('Apple')} style={styles.gap} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Hesabınız yok mu? </Text>
        <Pressable onPress={() => router.replace('/(auth)/register')} hitSlop={8}>
          <Text style={styles.link}>Hesap oluşturun</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: fontSize.md, color: colors.textSecondary, marginBottom: spacing.xxl, lineHeight: 22 },
  forgot: { alignSelf: 'flex-end', marginBottom: spacing.xl, marginTop: -spacing.sm },
  link: { color: colors.accent, fontWeight: '600', fontSize: fontSize.sm },
  gap: { marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xxl },
  footerText: { color: colors.textSecondary, fontSize: fontSize.sm },
});
