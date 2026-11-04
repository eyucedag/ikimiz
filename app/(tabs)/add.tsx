import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge, Card, Divider, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { showSoon } from '@/src/utils/soon';

interface QuickAction {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  route?: string;
  soonDetail?: string;
}

const actions: QuickAction[] = [
  { key: 'screen-note', title: 'Ekran Notu', description: "Partnerinizin ana ekranına kısa not", icon: 'edit-3', route: '/screen-note/compose' },
  { key: 'event', title: 'Etkinlik', description: 'Takvime plan veya önemli gün', icon: 'calendar', soonDetail: 'Ortak takvim ve tekrarlayan etkinlikler Aşama 2’de eklenecek.' },
  { key: 'list', title: 'Liste', description: 'Market, film, seyahat listesi', icon: 'list', soonDetail: 'Paylaşılan listeler Aşama 2’de eklenecek.' },
  { key: 'note', title: 'Not', description: 'Kişisel veya ortak not', icon: 'file-text', soonDetail: 'Klasörlü notlar Aşama 2’de eklenecek.' },
  { key: 'task', title: 'Görev', description: 'Atanabilir ve tekrarlanabilir iş', icon: 'check-square', soonDetail: 'Görevler ve atamalar Aşama 2’de eklenecek.' },
  { key: 'gift', title: 'Hediye Fikri', description: 'Partnerinizden gizli fikir', icon: 'gift', soonDetail: 'Hediye Radarı Aşama 2’de eklenecek.' },
  { key: 'reminder', title: 'Hatırlatma', description: 'Zamanı gelince bildirim', icon: 'bell', soonDetail: 'Hatırlatmalar ve bildirim zamanlama Aşama 2’de eklenecek.' },
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
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={[styles.icon, !a.route && styles.iconMuted]}>
                <Feather name={a.icon} size={20} color={a.route ? colors.accent : colors.earth2} />
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
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
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
