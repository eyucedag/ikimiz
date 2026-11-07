import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export type ImportantDateKind = 'anniversary' | 'birthday' | 'other';
export interface ImportantDate {
  id: string;
  ownerId: string;
  coupleId: string;
  title: string;
  date: string;
  kind: ImportantDateKind;
}

function mapRow(row: Record<string, unknown>): ImportantDate {
  return {
    id: String(row.id), ownerId: String(row.owner_id), coupleId: String(row.couple_id),
    title: String(row.title), date: String(row.date), kind: row.kind as ImportantDateKind,
  };
}

export const importantDateService = {
  async list(coupleId: string): Promise<ImportantDate[]> {
    const { data, error } = await supabase.from('important_dates').select('*')
      .eq('couple_id', coupleId).eq('is_deleted', false).eq('visibility', 'shared').order('date');
    if (error) throw new Error(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Özel Günler tablosu hazır değil. Supabase migration SQL’ini çalıştırın.'
      : 'Özel günler yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.');
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  },
  async save(input: Omit<ImportantDate, 'id'> & { id?: string; partnerId: string }): Promise<ImportantDate> {
    const title = input.title.trim();
    if (!title) throw new Error('Özel günün adını yazın.');
    const values = { title, date: input.date, kind: input.kind, owner_id: input.ownerId, couple_id: input.coupleId, visibility: 'shared', is_deleted: false };
    const query = input.id
      ? supabase.from('important_dates').update({ title, date: input.date, kind: input.kind }).eq('id', input.id)
      : supabase.from('important_dates').insert(values);
    const { data, error } = await query.select('*').single();
    if (error || !data) throw new Error(error?.code === '42P01' || error?.code === 'PGRST205'
      ? 'Özel Günler tablosu hazır değil. Supabase migration SQL’ini çalıştırın.'
      : 'Özel gün kaydedilemedi. Lütfen yeniden deneyin.');
    const saved = mapRow(data as Record<string, unknown>);
    await notificationService.notifyPartner({
      partnerId: input.partnerId, coupleId: input.coupleId,
      title: input.id ? 'Özel gün güncellendi' : 'Özel gün eklendi',
      body: `${saved.title} · ${saved.date}`,
    });
    return saved;
  },
  async remove(id: string): Promise<void> {
    const { data, error } = await supabase.from('important_dates')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw new Error(`Özel gün kaldırılamadı: ${error.message}`);
    if (!data) throw new Error('Özel gün bulunamadı veya kaldırma yetkiniz yok.');
  },
};
