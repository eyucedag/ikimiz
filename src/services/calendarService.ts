import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface CoupleCalendarEvent {
  id: string;
  ownerId: string;
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  allDay: boolean;
}
const mapEvent = (row: Record<string, unknown>): CoupleCalendarEvent => ({
  id: String(row.id),
  ownerId: String(row.owner_id),
  title: String(row.title),
  description: row.description == null ? null : String(row.description),
  location: row.location == null ? null : String(row.location),
  startsAt: String(row.starts_at),
  allDay: Boolean(row.all_day),
});

export const calendarService = {
  async list(coupleId: string): Promise<CoupleCalendarEvent[]> {
    const { data, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('visibility', 'shared')
      .eq('is_deleted', false)
      .order('starts_at')
      .limit(500);
    if (error)
      throw new Error(
        error.code === '42P01' || error.code === 'PGRST205'
          ? 'Takvim tablosu hazır değil. Supabase migration SQL’ini çalıştırın.'
          : 'Takvim kayıtları yüklenemedi. Bağlantınızı kontrol edip yeniden deneyin.',
      );
    return (data ?? []).map((row) => mapEvent(row as Record<string, unknown>));
  },
  async add(input: {
    ownerId: string;
    partnerId: string;
    coupleId: string;
    title: string;
    startsAt: string;
    location?: string;
  }): Promise<CoupleCalendarEvent> {
    const title = input.title.trim();
    if (!title) throw new Error('Etkinlik adını yazın.');
    const { data, error } = await supabase
      .from('calendar_events')
      .insert({
        owner_id: input.ownerId,
        couple_id: input.coupleId,
        visibility: 'shared',
        is_deleted: false,
        title,
        starts_at: input.startsAt,
        location: input.location?.trim() || null,
        all_day: false,
      })
      .select('*')
      .single();
    if (error || !data)
      throw new Error(
        error?.code === '42P01' || error?.code === 'PGRST205'
          ? 'Takvim tablosu hazır değil. Supabase migration SQL’ini çalıştırın.'
          : 'Etkinlik eklenemedi. Lütfen yeniden deneyin.',
      );
    const event = mapEvent(data as Record<string, unknown>);
    await notificationService.notifyPartner({
      partnerId: input.partnerId,
      coupleId: input.coupleId,
      category: 'event',
      title: 'Takvime etkinlik eklendi',
      body: event.title,
    });
    return event;
  },
  async update(input: {
    id: string;
    partnerId: string;
    coupleId: string;
    title: string;
    startsAt: string;
    location?: string;
  }): Promise<CoupleCalendarEvent> {
    const title = input.title.trim();
    if (!title) throw new Error('Etkinlik adını yazın.');
    const { data, error } = await supabase
      .from('calendar_events')
      .update({
        title,
        starts_at: input.startsAt,
        location: input.location?.trim() || null,
      })
      .eq('id', input.id)
      .eq('couple_id', input.coupleId)
      .select('*')
      .single();
    if (error || !data)
      throw new Error(
        error?.code === '42501'
          ? 'Etkinliği düzenleme izni eksik. Supabase takvim düzenleme SQL’ini çalıştırın.'
          : `Etkinlik güncellenemedi${error?.message ? `: ${error.message}` : '.'}`,
      );
    const event = mapEvent(data as Record<string, unknown>);
    await notificationService.notifyPartner({
      partnerId: input.partnerId,
      coupleId: input.coupleId,
      category: 'event',
      title: 'Takvim etkinliği güncellendi',
      body: event.title,
    });
    return event;
  },
  async remove(id: string): Promise<void> {
    const { data, error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) {
      const missingSetup = error.code === '42501' || error.code === 'PGRST301';
      throw new Error(
        missingSetup
          ? 'Etkinliği silme izni eksik. Supabase SQL Editor’da takvim silme izni SQL’ini çalıştırın.'
          : `Etkinlik kaldırılamadı: ${error.message}`,
      );
    }
    if (!data) throw new Error('Etkinlik bulunamadı veya ortak alandan kaldırılmış.');
  },
};
