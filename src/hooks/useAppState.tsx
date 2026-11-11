import { AppState } from 'react-native';
import { useRequestGuard } from './useRequestGuard';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KissAnimationOverlay } from '@/src/components/KissAnimationOverlay';
import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';
import { KissRecord } from '@/src/services/kissService';
import { AppNotification, UpcomingItem } from '@/src/types';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';
import { useLocalDate } from './useLocalDate';
import {
  buildUpcomingItems,
  upcomingWindow,
  UpcomingEventRow,
  UpcomingSpecialRow,
} from '@/src/utils/upcoming';

interface AppStateValue {
  notifications: AppNotification[];
  unreadCount: number;
  upcoming: UpcomingItem[];
  refreshUpcoming: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  incomingKiss: KissRecord | null;
  dismissKiss: () => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

/** Uygulama genelinde paylaşılan durum (ör. sekme çubuğundaki okunmamış bildirim sayısı). */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const { couple } = useCouple();
  const coupleId = couple?.id;
  const localDate = useLocalDate();
  const beginNotifications = useRequestGuard();
  const beginUpcoming = useRequestGuard();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);
  const [incomingKiss, setIncomingKiss] = useState<KissRecord | null>(null);
  const dismissKiss = useCallback(() => setIncomingKiss(null), []);

  useEffect(() => {
    if (!userId || !coupleId) {
      setIncomingKiss(null);
      return;
    }
    let active = true;
    let lastSeenId: string | null = null;
    let receivedLive = false;
    const seen = new Set<string>();
    let latestTimestamp = 0;
    const seenKey = `ikimiz:last-seen-kiss:${userId}`;
    const showIncoming = (row: Record<string, unknown>) => {
      if (
        !active ||
        row.partner_id !== userId ||
        row.couple_id !== coupleId ||
        typeof row.id !== 'string' ||
        row.id === lastSeenId
      )
        return;
      const timestamp = new Date(String(row.created_at)).getTime();
      if (!Number.isFinite(timestamp) || timestamp < latestTimestamp || seen.has(row.id)) return;
      latestTimestamp = timestamp;
      seen.add(row.id);
      lastSeenId = row.id;
      const record: KissRecord = {
        id: row.id,
        ownerId: String(row.owner_id),
        partnerId: String(row.partner_id),
        coupleId: String(row.couple_id),
        localDate: String(row.local_date),
        createdAt: String(row.created_at),
      };
      setIncomingKiss(record);
      void supabase
        .from('profiles')
        .select('display_name')
        .eq('id', record.ownerId)
        .maybeSingle()
        .then(({ data }) => {
          if (active && data?.display_name)
            setIncomingKiss((current) =>
              current?.id === record.id ? { ...current, senderName: data.display_name } : current,
            );
        });
      void AsyncStorage.setItem(seenKey, row.id).catch(() => undefined);
    };
    void (async () => {
      try {
        const storedLastSeenId = await AsyncStorage.getItem(seenKey);
        if (lastSeenId === null) lastSeenId = storedLastSeenId;
        const { data } = await supabase
          .from('kisses')
          .select('id, owner_id, partner_id, couple_id, local_date, created_at')
          .eq('partner_id', userId)
          .eq('couple_id', coupleId ?? '')
          .order('created_at', { ascending: false })
          .limit(1);
        const latest = data?.[0] as Record<string, unknown> | undefined;
        if (
          !receivedLive &&
          latest &&
          Date.now() - new Date(String(latest.created_at)).getTime() < 24 * 60 * 60 * 1000
        )
          showIncoming(latest);
      } catch {
        // Realtime can still deliver new events if the catch-up query is unavailable.
      }
    })();
    const channel = supabase
      .channel(`kisses-for-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'kisses',
          filter: `partner_id=eq.${userId}`,
        },
        ({ new: row }) => {
          receivedLive = true;
          showIncoming(row as Record<string, unknown>);
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId, coupleId]);

  const refreshNotifications = useCallback(async () => {
    const current = beginNotifications();
    if (!userId) {
      setNotifications([]);
      return;
    }
    try {
      const rows = await notificationService.list(userId);
      if (current()) setNotifications(rows);
    } catch {
      // Ağ hatasında mevcut liste korunur.
    }
  }, [userId, beginNotifications]);

  const refreshUpcoming = useCallback(async () => {
    const current = beginUpcoming();
    if (!userId || !coupleId) {
      setUpcoming([]);
      return;
    }
    try {
      const now = new Date();
      const { start, end } = upcomingWindow(now);
      const [events, specials] = await Promise.all([
        supabase
          .from('calendar_events')
          .select('id,title,location,starts_at,all_day')
          .eq('couple_id', coupleId)
          .eq('visibility', 'shared')
          .eq('is_deleted', false)
          .gte('starts_at', start.toISOString())
          .lte('starts_at', end.toISOString())
          .order('starts_at')
          .limit(100),
        supabase
          .from('important_dates')
          .select('id,title,date,kind')
          .eq('couple_id', coupleId)
          .eq('visibility', 'shared')
          .eq('is_deleted', false),
      ]);
      if (events.error) throw events.error;
      if (specials.error && !['42P01', 'PGRST205'].includes(specials.error.code)) throw specials.error;
      if (current())
        setUpcoming(
          buildUpcomingItems(
            (events.data ?? []) as UpcomingEventRow[],
            (specials.data ?? []) as UpcomingSpecialRow[],
            now,
          ),
        );
    } catch {
      // Keep the last successful snapshot during a temporary network failure.
    }
  }, [userId, coupleId, beginUpcoming]);

  useEffect(() => {
    void refreshNotifications();
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `owner_id=eq.${userId}` },
        () => {
          void refreshNotifications();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshNotifications, userId]);

  useEffect(() => {
    void refreshUpcoming();
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refreshUpcoming();
    }, 60_000);
    if (!coupleId) return () => clearInterval(timer);
    const channel = supabase
      .channel(`upcoming-events-${user?.id ?? 'guest'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'calendar_events', filter: `couple_id=eq.${coupleId}` },
        () => {
          void refreshUpcoming();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'important_dates', filter: `couple_id=eq.${coupleId}` },
        () => {
          void refreshUpcoming();
        },
      )
      .subscribe();
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [refreshUpcoming, user?.id, coupleId, localDate]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshNotifications();
        void refreshUpcoming();
      }
    });
    return () => listener.remove();
  }, [refreshNotifications, refreshUpcoming]);

  const value = useMemo<AppStateValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.readAt).length,
      upcoming,
      refreshUpcoming,
      refreshNotifications,
      markAllRead: async () => {
        if (!user) return;
        await notificationService.markAllRead(user.id);
        await refreshNotifications();
      },
      markRead: async (id) => {
        await notificationService.markRead(id);
        await refreshNotifications();
      },
      incomingKiss,
      dismissKiss,
    }),
    [notifications, refreshNotifications, upcoming, refreshUpcoming, user, incomingKiss, dismissKiss],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
      <KissAnimationOverlay event={incomingKiss} onFinish={dismissKiss} />
    </AppStateContext.Provider>
  );
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState, AppStateProvider içinde kullanılmalıdır.');
  return ctx;
}
