import { mockStore, nowIso } from '@/src/lib/mock-store';
import { isMockMode, requireSupabase } from '@/src/lib/supabase';
import { AppNotification } from '@/src/types';

const mapNotification = (row: any): AppNotification => ({
  id: row.id,
  userId: row.owner_id,
  category: row.category,
  title: row.title,
  body: row.body,
  readAt: row.read_at,
  createdAt: row.created_at,
});

export const notificationService = {
  async list(userId: string): Promise<AppNotification[]> {
    if (isMockMode) {
      const db = await mockStore.read();
      return db.notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const { data, error } = await requireSupabase()
      .from('notifications')
      .select('*')
      .eq('owner_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapNotification);
  },

  async markAllRead(userId: string): Promise<void> {
    if (isMockMode) {
      await mockStore.update((db) => {
        db.notifications.forEach((n) => {
          if (n.userId === userId && !n.readAt) n.readAt = nowIso();
        });
      });
      return;
    }
    await requireSupabase().from('notifications').update({ read_at: nowIso() }).eq('owner_id', userId).is('read_at', null);
  },

  async markRead(id: string): Promise<void> {
    if (isMockMode) {
      await mockStore.update((db) => {
        const n = db.notifications.find((x) => x.id === id);
        if (n && !n.readAt) n.readAt = nowIso();
      });
      return;
    }
    await requireSupabase().from('notifications').update({ read_at: nowIso() }).eq('id', id);
  },
};
