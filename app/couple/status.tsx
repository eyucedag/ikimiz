import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Button, Card, CoupleLoading, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useCouple } from '@/src/hooks/useCouple';

export default function PartnerScreen() {
  const router = useRouter();
  const couple = useCouple();
  const [ending, setEnding] = useState(false);

  const confirmEnd = () => Alert.alert(
    'Partner bağlantısını sonlandır',
    'Ortak alana erişiminiz kapanır. Kişisel verileriniz korunur. Emin misiniz?',
    [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sonlandır', style: 'destructive', onPress: async () => {
        setEnding(true);
        const result = await couple.endCouple();
        setEnding(false);
        if (result.error) Alert.alert('Sonlandırılamadı', result.error);
      } },
    ],
  );

  if (couple.loading) return <Screen title="Partner"><CoupleLoading /></Screen>;

  if (!couple.isPaired) return <Screen title="Partner">
    <EmptyState icon="user-plus" title={couple.pendingInvitation ? 'Davetiniz bekliyor' : 'Partner ekleyin'}
      description={couple.pendingInvitation ? 'Davet kodunuzu partnerinizle paylaşın veya kod girerek gelen daveti kabul edin.' : 'Partnerinizi davet edin ya da size verilen davet kodunu girin.'} />
    <Button title={couple.pendingInvitation ? 'Davet kodunu aç' : 'Partner davet et'} icon="user-plus" onPress={() => router.push('/couple/invite')} />
    <Button title="Davet kodum var" variant="secondary" onPress={() => router.push('/couple/accept')} style={styles.secondary} />
  </Screen>;

  return <Screen title="Partner">
    <Card style={styles.card}>
      <View style={styles.partnerRow}>
        <View style={styles.icon}><Feather name="user" size={22} color={colors.accent} /></View>
        <View style={styles.copy}>
          <Text style={styles.name}>{couple.partner?.displayName ?? 'Partneriniz'}</Text>
          {couple.partner?.email ? <Text style={styles.meta}>{couple.partner.email}</Text> : null}
        </View>
      </View>
    </Card>
    <Button title="Partner bağlantısını sonlandır" variant="danger" icon="x-circle" onPress={confirmEnd} loading={ending} />
  </Screen>;
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  partnerRow: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: radius.control, backgroundColor: colors.accentLight, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  copy: { flex: 1 },
  name: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  secondary: { marginTop: spacing.md },
});
