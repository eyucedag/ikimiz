import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Badge, Button, Card, EmptyState, Screen } from '@/src/components/ui';
import { getCategory } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';

/** Aşama 2'de her kategori için planlanan başlıca özellikler. */
const plannedFeatures: Record<string, string[]> = {
  takvim: ['Ortak ve kişisel etkinlikler', 'Yıl dönümü ve doğum günleri', 'Tekrarlayan etkinlikler (RRULE)'],
  listeler: ['Market, film, seyahat listeleri', 'Maddeleri birlikte işaretleme', 'Kişisel veya ortak görünürlük'],
  notlar: ['Klasörlerle düzen', 'Kişisel ve ortak notlar', 'Hızlı arama'],
  gorevler: ['Partnere görev atama', 'Tekrarlayan görevler', 'Son tarih ve öncelik'],
  'hediye-radari': ['Partnerden gizli fikirler', 'Fiyat ve bağlantı kaydı', 'Özel günlere bağlama'],
  'bilinmesi-gerekenler': ['Beden ve ölçüler', 'Alerjiler ve hassasiyetler', 'Sevdiği ve sevmediği şeyler'],
  unutma: ['Zamanlı hatırlatmalar', 'Tekrarlayan hatırlatmalar', 'Partnere hatırlatma gönderme'],
};

export default function CategoryScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = getCategory(slug);

  if (slug === 'ekrana-not') return <Redirect href="/screen-note/compose" />;

  if (!category) {
    return (
      <Screen title="Kategori">
        <EmptyState icon="compass" title="Kategori bulunamadı" description="Aradığınız kategori mevcut değil." actionLabel="Ana sayfaya dön" onAction={() => router.replace('/(tabs)')} />
      </Screen>
    );
  }

  const features = plannedFeatures[category.slug] ?? [];

  return (
    <Screen title={category.title}>
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Feather name={category.icon as keyof typeof Feather.glyphMap} size={32} color={colors.accent} />
        </View>
        <Badge label="Yakında · Aşama 2" tone="earth" />
        <Text style={styles.description}>{category.description}</Text>
      </View>

      {features.length > 0 ? (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Neler gelecek?</Text>
          {features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check" size={16} color={colors.accent} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      <Text style={styles.note}>Bu bölüm geliştirme aşamasında. Hazır olduğunda ana ekrandaki kategori kartından doğrudan erişebileceksiniz.</Text>
      <Button title="Bu arada Ekrana Not bırakın" icon="edit-3" variant="secondary" onPress={() => router.push('/screen-note/compose')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.xxl },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.card,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  description: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  card: { marginBottom: spacing.xl },
  cardTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text, marginBottom: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs },
  featureText: { marginLeft: spacing.sm, fontSize: fontSize.sm, color: colors.text },
  note: { fontSize: fontSize.sm, color: colors.textTertiary, textAlign: 'center', lineHeight: 19, marginBottom: spacing.lg },
});
