import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge, Card, Divider, Screen } from '@/src/components/ui';
import { getCategoryColor } from '@/src/constants/categories';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { showSoon } from '@/src/utils/soon';

interface QuickAction {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  category: string;
  route?: string;
  soonDetail?: string;
}

const actions: QuickAction[] = [
  { key: 'travel', title: 'Gezdiğimiz Yerler', description: 'Gittiğiniz şehirleri ortak haritaya ekle', icon: 'map-pin', category: 'gezilen-yerler', route: '/travel-map' },
  { key: 'special-date', title: 'Özel Gün', description: 'Yıl dönümü, doğum günü veya anlamlı bir tarih ekle', icon: 'gift', category: 'ozel-gunler', route: '/special-dates' },
  { key: 'screen-note', title: 'Ekran Notu', description: "Partnerinizin ana ekranına kısa not", icon: 'edit-3', category: 'ekrana-not', route: '/screen-note/compose' },
  { key: 'event', title: 'Etkinlik', description: 'Ortak takvime bir etkinlik ekle', icon: 'calendar', category: 'takvim', route: '/calendar' },
  { key: 'list', title: 'Liste', description: 'Market, film, seyahat listesi', icon: 'list', category: 'listeler', route: '/lists' },
  { key: 'note', title: 'Not', description: 'Kişisel veya ortak not', icon: 'file-text', category: 'notlar', soonDetail: 'Klasörlü notlar Aşama 2’de eklenecek.' },
  { key: 'task', title: 'Görev', description: 'Atanabilir ve tekrarlanabilir iş', icon: 'check-square', category: 'gorevler', soonDetail: 'Görevler ve atamalar Aşama 2’de eklenecek.' },
  { key: 'gift', title: 'Hediye Fikri', description: 'Partnerinizden gizli fikir', icon: 'gift', category: 'hediye-radari', soonDetail: 'Hediye Radarı Aşama 2’de eklenecek.' },
];

export default function AddScreen() {
  const router = useRouter();

  const onSelect = (a: QuickAction) => (a.route ? router.push(a.route) : showSoon(a.title, a.soonDetail));

  return (
    <Screen inTabs>
      <Text style={styles.title} accessibilityRole="header">
        Hızlı Ekle
      </Text>
      <Text style={styles.lead}>Ne eklemek istersiniz?</Text>
      <Card style={styles.card}>
        {actions.map((a, index) => (
          <View key={a.key}>
            {index > 0 ? <Divider inset={56} /> : null}
            <Pressable
              onPress={() => onSelect(a)}
              accessibilityRole="button"
              accessibilityLabel={a.route ? a.title : `${a.title}, yakında`}
              style={({ pressed }) => [styles.row, { borderLeftColor: getCategoryColor(a.category).color }, pressed && styles.pressed]}
            >
              <View style={[styles.icon, { backgroundColor: getCategoryColor(a.category).tint }]}>
                <Feather name={a.icon} size={20} color={getCategoryColor(a.category).color} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.rowTitle}>{a.title}</Text>
                <Text style={styles.rowSubtitle}>{a.description}</Text>
              </View>
              {a.route ? <Feather name="chevron-right" size={18} color={colors.textTertiary} /> : <Badge label="Yakında" tone="neutral" />}
            </Pressable>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  lead: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  card: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingLeft: spacing.sm, borderLeftWidth: 3 },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.control,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  iconMuted: { backgroundColor: colors.beige },
  flex: { flex: 1, marginRight: spacing.sm },
  rowTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  rowSubtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  pressed: { opacity: 0.6 },
});
