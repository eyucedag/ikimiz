import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface NotebookNote {
  id: string;
  ownerId: string;
  title: string;
  body: string;
  updatedAt: string;
}

const mapNote = (row: Record<string, unknown>): NotebookNote => ({
  id: String(row.id), ownerId: String(row.owner_id), title: String(row.title),
  body: String(row.body ?? ''), updatedAt: String(row.updated_at ?? row.created_at),
});

export const notebookService = {
  async list(coupleId: string, limit = 500): Promise<NotebookNote[]> {
    const { data, error } = await supabase.from('notes').select('id, owner_id, title, body, updated_at, created_at')
      .eq('couple_id', coupleId).eq('visibility', 'shared').eq('is_deleted', false).order('updated_at', { ascending: false }).limit(limit);
    if (error) throw new Error(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Not Defteri için Supabase’de notes tablosu bulunamadı. Önce ana şema kurulumunu çalıştırın.'
      : 'Not Defteri yüklenemedi. Bağlantınızı kontrol edin.');
    return ((data ?? []) as Record<string, unknown>[]).map(mapNote);
  },

  async save(input: { id?: string; ownerId: string; partnerId: string; coupleId: string; title: string; body: string }): Promise<NotebookNote> {
    const title = input.title.trim();
    const body = input.body.trim();
    if (!title) throw new Error('Not başlığı yazın.');
    if (!body) throw new Error('Not içeriğini yazın.');
    const payload = { title, body, updated_at: new Date().toISOString() };
    const query = input.id
      ? supabase.from('notes').update(payload).eq('id', input.id).eq('couple_id', input.coupleId)
      : supabase.from('notes').insert({ ...payload, owner_id: input.ownerId, couple_id: input.coupleId, visibility: 'shared', is_deleted: false });
    const { data, error } = await query.select('id, owner_id, title, body, updated_at, created_at').single();
    if (error || !data) throw new Error('Not kaydedilemedi. Bağlantınızı kontrol edip yeniden deneyin.');
    const note = mapNote(data as Record<string, unknown>);
    await notificationService.notifyPartner({
      partnerId: input.partnerId, coupleId: input.coupleId,
      title: input.id ? 'Ortak not güncellendi' : 'Ortak nota eklendi', body: note.title,
    });
    return note;
  },

  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from('notes').delete().eq('id', id).select('id').maybeSingle();
    if (error || !data) throw new Error('Not kaldırılamadı. Yalnızca notu ekleyen kişi kaldırabilir.');
  },
};
