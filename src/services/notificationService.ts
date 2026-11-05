import { nowIso, supabase } from '@/src/lib/supabase';
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
  async notifyKissPartner(input: { partnerId: string; coupleId: string }): Promise<void> {
    try {
      const { error } = await supabase.rpc('notify_kiss_partner_once_per_hour', {
        p_partner_id: input.partnerId,
        p_couple_id: input.coupleId,
      });
      if (error) console.warn('Öpücük bildirimi sınırlandırılamadı. Supabase SQL migration kurulumu gerekli:', error.message);
    } catch (error) {
      console.warn('Öpücük bildirimi sınırlandırılamadı:', error);
    }
  },

  async notifyPartner(input: {
    partnerId: string;
    coupleId: string;
    category?: AppNotification['category'];
    title: string;
    body: string;
  }): Promise<void> {
    try {
      const { error } = await supabase.from('notifications').insert({
        owner_id: input.partnerId,
        couple_id: input.coupleId,
        category: input.category ?? 'couple',
        title: input.title,
        body: input.body,
      });
      if (error) console.warn('Partner bildirimi kaydedilemedi:', error.message);
    } catch (error) {
      console.warn('Partner bildirimi kaydedilemedi:', error);
    }
  },

  async list(userId: string): Promise<AppNotification[]> {
    const { data, error } = await supabase
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
    await supabase.from('notifications').update({ read_at: nowIso() }).eq('owner_id', userId).is('read_at', null);
  },

  async markRead(id: string): Promise<void> {
    await supabase.from('notifications').update({ read_at: nowIso() }).eq('id', id);
  },
};
