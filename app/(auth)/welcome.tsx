import { StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { Button, Divider, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { showSocialSoon } from '@/src/utils/soon';

const highlights: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'calendar', text: 'Ortak takvim ve önemli günler' },
  { icon: 'check-square', text: 'Paylaşılan listeler ve görevler' },
  { icon: 'edit-3', text: 'Partnerinizin ekranına küçük notlar' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <Feather name="users" size={30} color={colors.accent} />
        </View>
        <Text style={styles.title}>İkimiz</Text>
        <Text style={styles.subtitle}>İkinizin ortak hayatını tek bir sakin alanda düzenleyin.</Text>
      </View>

      <View style={styles.list}>
        {highlights.map((h) => (
          <View key={h.icon} style={styles.item}>
            <Feather name={h.icon} size={18} color={colors.earth2} />
            <Text style={styles.itemText}>{h.text}</Text>
          </View>
        ))}
      </View>

      <Button title="Giriş Yap" onPress={() => router.push('/(auth)/login')} />
      <Button
        title="Hesap Oluştur"
        variant="secondary"
        onPress={() => router.push('/(auth)/register')}
        style={styles.gap}
      />

      <Divider spaced />
      <Button
        title="Google ile devam et"
        icon="globe"
        variant="secondary"
        onPress={() => showSocialSoon('Google')}
      />
      <Button
        title="Apple ile devam et"
        icon="smartphone"
        variant="secondary"
        onPress={() => showSocialSoon('Apple')}
        style={styles.gap}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xxxl, marginBottom: spacing.xxl },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: { fontSize: fontSize.xxxl, fontWeight: '700', color: colors.text },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  list: {
    backgroundColor: colors.beige,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  itemText: { marginLeft: spacing.md, fontSize: fontSize.md, color: colors.text },
  gap: { marginTop: spacing.md },
});
