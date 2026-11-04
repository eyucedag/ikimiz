import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { notificationService } from '@/src/services/notificationService';
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
}

const AppStateContext = createContext<AppStateValue | null>(null);

/** Uygulama genelinde paylaşılan durum (ör. sekme çubuğundaki okunmamış bildirim sayısı). */
export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

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
    }),
    [notifications, refreshNotifications, user],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState, AppStateProvider içinde kullanılmalıdır.');
  return ctx;
}
