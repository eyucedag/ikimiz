import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export type SharedListKind = 'general' | 'grocery' | 'movie' | 'travel' | 'wish';

export interface SharedList {
  id: string;
  ownerId: string;
  coupleId: string;
  title: string;
  kind: SharedListKind;
  createdAt: string;
  itemCount: number;
  checkedCount: number;
}

export interface SharedListItem {
  id: string;
  listId: string;
  ownerId: string;
  content: string;
  isChecked: boolean;
  checkedBy: string | null;
  position: number;
  createdAt: string;
}

const mapList = (row: Record<string, unknown>, counts = { itemCount: 0, checkedCount: 0 }): SharedList => ({
  id: String(row.id), ownerId: String(row.owner_id), coupleId: String(row.couple_id),
  title: String(row.title), kind: row.kind as SharedListKind, createdAt: String(row.created_at), ...counts,
});

const mapItem = (row: Record<string, unknown>): SharedListItem => ({
  id: String(row.id), listId: String(row.list_id), ownerId: String(row.owner_id),
  content: String(row.content), isChecked: Boolean(row.is_checked),
  checkedBy: row.checked_by == null ? null : String(row.checked_by),
  position: Number(row.position ?? 0), createdAt: String(row.created_at),
});

function databaseError(error: { code?: string } | null, fallback: string) {
  return error?.code === '42P01' || error?.code === 'PGRST205'
    ? 'Listeler tablosu hazır değil. Supabase SQL Editor’da 20261105_shared_lists.sql kurulumunu çalıştırın.'
    : fallback;
}

export const listService = {
  async list(coupleId: string): Promise<SharedList[]> {
    const { data, error } = await supabase.from('lists').select('id, owner_id, couple_id, title, kind, created_at')
      .eq('couple_id', coupleId).eq('visibility', 'shared').eq('is_deleted', false).order('created_at', { ascending: false });
    if (error) throw new Error(databaseError(error, 'Listeler yüklenemedi. Bağlantınızı kontrol edin.'));
    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) return [];
    const ids = rows.map((row) => String(row.id));
    const { data: itemRows, error: itemError } = await supabase.from('list_items')
      .select('list_id, is_checked').in('list_id', ids).eq('couple_id', coupleId).eq('is_deleted', false);
    if (itemError) throw new Error(databaseError(itemError, 'Liste maddeleri yüklenemedi.'));
    const counts = new Map<string, { itemCount: number; checkedCount: number }>();
    for (const item of (itemRows ?? []) as Record<string, unknown>[]) {
      const id = String(item.list_id);
      const current = counts.get(id) ?? { itemCount: 0, checkedCount: 0 };
      current.itemCount += 1;
      if (item.is_checked) current.checkedCount += 1;
      counts.set(id, current);
    }
    return rows.map((row) => mapList(row, counts.get(String(row.id))));
  },

  async get(listId: string, coupleId: string): Promise<SharedList> {
    const { data, error } = await supabase.from('lists').select('id, owner_id, couple_id, title, kind, created_at')
      .eq('id', listId).eq('couple_id', coupleId).eq('visibility', 'shared').eq('is_deleted', false).single();
    if (error || !data) throw new Error(databaseError(error, 'Liste bulunamadı veya erişiminiz yok.'));
    return mapList(data as Record<string, unknown>);
  },

  async items(listId: string, coupleId: string): Promise<SharedListItem[]> {
    const { data, error } = await supabase.from('list_items').select('*')
      .eq('list_id', listId).eq('couple_id', coupleId).eq('is_deleted', false)
      .order('position').order('created_at');
    if (error) throw new Error(databaseError(error, 'Liste maddeleri yüklenemedi.'));
    return ((data ?? []) as Record<string, unknown>[]).map(mapItem);
  },

  async create(input: { ownerId: string; partnerId: string; coupleId: string; title: string; kind: SharedListKind }): Promise<SharedList> {
    const title = input.title.trim();
    if (!title) throw new Error('Liste adını yazın.');
    const { data, error } = await supabase.from('lists').insert({
      owner_id: input.ownerId, couple_id: input.coupleId, visibility: 'shared', is_deleted: false, title, kind: input.kind,
    }).select('id, owner_id, couple_id, title, kind, created_at').single();
    if (error || !data) throw new Error(databaseError(error, 'Liste oluşturulamadı. Eşleşmenizi kontrol edin.'));
    const list = mapList(data as Record<string, unknown>);
    await notificationService.notifyPartner({ partnerId: input.partnerId, coupleId: input.coupleId, title: 'Ortak liste oluşturuldu', body: list.title });
    return list;
  },

  async remove(listId: string): Promise<void> {
    const { data, error } = await supabase.from('lists').delete().eq('id', listId).select('id').maybeSingle();
    if (error) throw new Error('Liste kaldırılamadı.');
    if (!data) throw new Error('Liste bulunamadı veya kaldırma yetkiniz yok.');
  },

  async addItem(input: { ownerId: string; partnerId: string; coupleId: string; listId: string; content: string; position: number }): Promise<SharedListItem> {
    const content = input.content.trim();
    if (!content) throw new Error('Liste maddesini yazın.');
    const { data, error } = await supabase.from('list_items').insert({
      owner_id: input.ownerId, couple_id: input.coupleId, list_id: input.listId,
      visibility: 'shared', is_deleted: false, content, position: input.position,
    }).select('*').single();
    if (error || !data) throw new Error(databaseError(error, 'Madde eklenemedi.'));
    const item = mapItem(data as Record<string, unknown>);
    await notificationService.notifyPartner({ partnerId: input.partnerId, coupleId: input.coupleId, title: 'Listeye madde eklendi', body: item.content });
    return item;
  },

  async toggleItem(input: { item: SharedListItem; userId: string; partnerId: string; coupleId: string }): Promise<SharedListItem> {
    const isChecked = !input.item.isChecked;
    const { data, error } = await supabase.from('list_items').update({
      is_checked: isChecked, checked_by: isChecked ? input.userId : null, updated_at: new Date().toISOString(),
    }).eq('id', input.item.id).select('*').single();
    if (error || !data) throw new Error('Liste maddesi güncellenemedi.');
    const item = mapItem(data as Record<string, unknown>);
    await notificationService.notifyPartner({
      partnerId: input.partnerId, coupleId: input.coupleId,
      title: isChecked ? 'Liste maddesi tamamlandı' : 'Liste maddesi yeniden açıldı', body: item.content,
    });
    return item;
  },

  async removeItem(itemId: string): Promise<void> {
    const { data, error } = await supabase.from('list_items').delete().eq('id', itemId).select('id').maybeSingle();
    if (error) throw new Error('Liste maddesi kaldırılamadı.');
    if (!data) throw new Error('Madde bulunamadı veya kaldırma yetkiniz yok.');
  },
};
