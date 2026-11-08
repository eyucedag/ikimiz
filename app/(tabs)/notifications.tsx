import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, Divider, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { getCategoryColor } from '@/src/constants/categories';
import { useAppState } from '@/src/hooks/useAppState';
import { AppNotification, NotificationCategory } from '@/src/types';
import { relativeTime } from '@/src/utils/date';

const categoryMeta: Record<NotificationCategory, { icon: keyof typeof Feather.glyphMap; route?: string }> = {
  system: { icon: 'info' },
  invitation: { icon: 'send', route: '/couple/status' },
  couple: { icon: 'link', route: '/couple/status' },
  screen_note: { icon: 'edit-3', route: '/screen-note/history' },
  event: { icon: 'calendar', route: '/calendar' },
  task: { icon: 'check-square', route: '/tasks' },
  reminder: { icon: 'bell' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadCount, refreshNotifications, markAllRead, markRead } = useAppState();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const open = async (n: AppNotification) => {
    try {
      if (!n.readAt) await markRead(n.id);
    } catch (cause) {
      Alert.alert('Bildirim güncellenemedi', cause instanceof Error ? cause.message : 'Yeniden deneyin.');
    }
    const route = categoryMeta[n.category]?.route;
    if (route) router.push(route);
  };

  return (
    <Screen inTabs refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Bildirimler
        </Text>
        {unreadCount > 0 ? (
          <Button
            title="Tümünü okundu say"
            variant="ghost"
            compact
            onPress={() => {
              void markAllRead().catch((cause: unknown) =>
                Alert.alert(
                  'Bildirimler güncellenemedi',
                  cause instanceof Error ? cause.message : 'Yeniden deneyin.',
                ),
              );
            }}
          />
        ) : null}
      </View>

      {notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Henüz bildirim yok"
          description="Partnerinizden gelen notlar ve eşleşme güncellemeleri burada görünecek."
        />
      ) : (
        <Card style={styles.card}>
          {notifications.map((n, index) => (
            <View key={n.id}>
              {index > 0 ? <Divider inset={52} /> : null}
              <Pressable
                onPress={() => open(n)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <View
                  style={[styles.icon, !n.readAt && { backgroundColor: getCategoryColor(n.category).tint }]}
                >
                  <Feather
                    name={categoryMeta[n.category]?.icon ?? 'info'}
                    size={18}
                    color={n.readAt ? colors.textTertiary : getCategoryColor(n.category).color}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.rowTitle, !n.readAt && styles.unread]}>{n.title}</Text>
                  <Text style={styles.rowBody} numberOfLines={2}>
                    {n.body}
                  </Text>
                  <Text style={styles.time}>{relativeTime(n.createdAt)}</Text>
                </View>
                {!n.readAt ? <View style={styles.dot} accessibilityLabel="Okunmadı" /> : null}
              </Pressable>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text },
  card: { paddingVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.control,
    backgroundColor: colors.beige,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  flex: { flex: 1 },
  rowTitle: { fontSize: fontSize.md, color: colors.text },
  unread: { fontWeight: '600' },
  rowBody: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  time: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.earth2,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },
  pressed: { opacity: 0.6 },
});
