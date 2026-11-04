import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Badge, Button, Card, CoupleLoading, Divider, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useCouple } from '@/src/hooks/useCouple';
import { formatDate } from '@/src/utils/date';

export default function CoupleStatusScreen() {
  const router = useRouter();
  const couple = useCouple();
  const [ending, setEnding] = useState(false);

  const confirmEnd = () =>
    Alert.alert(
      'Eşleşmeyi sonlandır',
      'Eşleşme sonlandırıldığında ortak alana erişiminiz kapanır. Kişisel verileriniz korunur. Emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sonlandır',
          style: 'destructive',
          onPress: async () => {
            setEnding(true);
            const result = await couple.endCouple();
            setEnding(false);
            if (result.error) Alert.alert('Sonlandırılamadı', result.error);
          },
        },
      ],
    );

  if (couple.loading) return <Screen title="Eşleşme Durumu"><CoupleLoading /></Screen>;

  if (!couple.isPaired) {
    return (
      <Screen title="Eşleşme Durumu">
        <EmptyState
          icon="link-2"
          title={couple.pendingInvitation ? 'Davetiniz bekliyor' : 'Henüz eşleşmediniz'}
          description={
            couple.pendingInvitation
              ? `${couple.pendingInvitation.code} kodlu davetiniz partnerinizin onayını bekliyor.`
              : 'Partnerinizi davet edin ya da size verilen kodu girin.'
          }
        />
        <Button title={couple.pendingInvitation ? 'Davete Git' : 'Partner Davet Et'} icon="send" onPress={() => router.push('/couple/invite')} />
        <Button title="Kodum Var" variant="secondary" onPress={() => router.push('/couple/accept')} style={styles.gap} />
      </Screen>
    );
  }

  return (
    <Screen title="Eşleşme Durumu">
      <Card style={styles.card}>
        <View style={styles.headerRow}>
          <View style={styles.icon}>
            <Feather name="users" size={22} color={colors.accent} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{couple.partner?.fullName ?? 'Partneriniz'}</Text>
            <Text style={styles.meta}>{couple.partner?.email}</Text>
          </View>
          <Badge label="Aktif" />
        </View>
        <Divider spaced />
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Eşleşme tarihi</Text>
          <Text style={styles.infoValue}>{couple.couple ? formatDate(couple.couple.createdAt) : '-'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Paylaşılan alan</Text>
          <Text style={styles.infoValue}>Ortak kayıtlar ve ekran notları</Text>
        </View>
      </Card>

      <Text style={styles.note}>
        Kişisel olarak işaretlediğiniz kayıtlar yalnızca size görünür; ortak kayıtlar ikinizin de erişimine açıktır.
      </Text>

      <Button title="Eşleşmeyi Sonlandır" variant="danger" icon="x-circle" onPress={confirmEnd} loading={ending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.control,
    backgroundColor: colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  flex: { flex: 1 },
  name: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  meta: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, color: colors.text, fontWeight: '500', flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  note: { fontSize: fontSize.sm, color: colors.textTertiary, lineHeight: 19, marginBottom: spacing.xxl },
  gap: { marginTop: spacing.md },
});
