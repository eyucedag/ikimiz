import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, Card, Divider, EmptyState, Screen } from '@/src/components/ui';
import { colors, fontSize, radius, spacing } from '@/src/constants/theme';
import { useAppState } from '@/src/hooks/useAppState';
import { AppNotification, NotificationCategory } from '@/src/types';
import { relativeTime } from '@/src/utils/date';

const categoryMeta: Record<NotificationCategory, { icon: keyof typeof Feather.glyphMap; route?: string }> = {
  system: { icon: 'info' },
  invitation: { icon: 'send', route: '/couple/status' },
  couple: { icon: 'link', route: '/couple/status' },
  screen_note: { icon: 'edit-3', route: '/screen-note/history' },
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
    if (!n.readAt) await markRead(n.id);
    const route = categoryMeta[n.category]?.route;
    if (route) router.push(route);
  };

  return (
    <Screen inTabs refreshing={refreshing} onRefresh={onRefresh}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Bildirimler
        </Text>
        {unreadCount > 0 ? <Button title="Tümünü okundu say" variant="ghost" compact onPress={markAllRead} /> : null}
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
              <Pressable onPress={() => open(n)} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
                <View style={[styles.icon, !n.readAt && styles.iconUnread]}>
                  <Feather name={categoryMeta[n.category]?.icon ?? 'info'} size={18} color={n.readAt ? colors.textTertiary : colors.accent} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.md },
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
  iconUnread: { backgroundColor: colors.accentLight },
  flex: { flex: 1 },
  rowTitle: { fontSize: fontSize.md, color: colors.text },
  unread: { fontWeight: '600' },
  rowBody: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  time: { fontSize: fontSize.xs, color: colors.textTertiary, marginTop: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.earth2, marginTop: spacing.sm, marginLeft: spacing.sm },
  pressed: { opacity: 0.6 },
});
