import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KissAnimationOverlay } from '@/src/components/KissAnimationOverlay';
import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';
import { KissRecord } from '@/src/services/kissService';
import { AppNotification, UpcomingItem } from '@/src/types';
import { useAuth } from './useAuth';

interface AppStateValue {
  notifications: AppNotification[];
  unreadCount: number;
  /** Takvim/Görev/Hatırlatma modülleri Aşama 2'de bu listeyi dolduracak. */
  upcoming: UpcomingItem[];
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
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [incomingKiss, setIncomingKiss] = useState<KissRecord | null>(null);
  const dismissKiss = useCallback(() => setIncomingKiss(null), []);

  useEffect(() => {
    if (!user) {
      setIncomingKiss(null);
      return;
    }
    let active = true;
    let lastSeenId: string | null = null;
    const seenKey = `ikimiz:last-seen-kiss:${user.id}`;
    const showIncoming = (row: Record<string, unknown>) => {
      if (!active || row.partner_id !== user.id || typeof row.id !== 'string' || row.id === lastSeenId) return;
      lastSeenId = row.id;
      setIncomingKiss({
        id: row.id,
        ownerId: String(row.owner_id),
        partnerId: String(row.partner_id),
        coupleId: String(row.couple_id),
        localDate: String(row.local_date),
        createdAt: String(row.created_at),
      });
      void AsyncStorage.setItem(seenKey, row.id);
    };
    void (async () => {
      try {
        const storedLastSeenId = await AsyncStorage.getItem(seenKey);
        if (lastSeenId === null) lastSeenId = storedLastSeenId;
        const { data } = await supabase.from('kisses')
          .select('id, owner_id, partner_id, couple_id, local_date, created_at')
          .eq('partner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        const latest = data?.[0] as Record<string, unknown> | undefined;
        if (latest && Date.now() - new Date(String(latest.created_at)).getTime() < 24 * 60 * 60 * 1000) showIncoming(latest);
      } catch {
        // Realtime can still deliver new events if the catch-up query is unavailable.
      }
    })();
    const channel = supabase.channel(`kisses-for-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'kisses', filter: `partner_id=eq.${user.id}`,
      }, ({ new: row }) => {
        showIncoming(row as Record<string, unknown>);
      })
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [user?.id]);

  const refreshNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      setNotifications(await notificationService.list(user.id));
    } catch {
      // Ağ hatasında mevcut liste korunur.
    }
  }, [user]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const value = useMemo<AppStateValue>(
    () => ({
      notifications,
      unreadCount: notifications.filter((n) => !n.readAt).length,
      upcoming: [],
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
    [notifications, refreshNotifications, user, incomingKiss, dismissKiss],
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
