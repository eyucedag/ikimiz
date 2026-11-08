import { normalizeHttpUrl } from '@/src/utils/url';
import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface DailySong {
  id: string;
  ownerId: string;
  coupleId: string;
  date: string;
  title: string;
  artist: string;
  url: string;
  createdAt: string;
}

const mapSong = (row: Record<string, unknown>): DailySong => ({
  id: String(row.id),
  ownerId: String(row.owner_id),
  coupleId: String(row.couple_id),
  date: String(row.song_date),
  title: String(row.title),
  artist: String(row.artist),
  url: String(row.url),
  createdAt: String(row.created_at),
});

function serviceError(error: { code?: string } | null, fallback: string) {
  if (error?.code === '42P10')
    return 'Günün Şarkısı güncellemesi eksik. Supabase SQL Editor’da 20261107_shared_daily_song_per_partner.sql dosyasını çalıştırın.';
  return error?.code === '42P01' || error?.code === 'PGRST205'
    ? 'Günün Şarkısı tablosu hazır değil. Supabase SQL Editor’da 20261105_shared_song_of_the_day.sql dosyasını çalıştırın.'
    : fallback;
}

export const songOfTheDayService = {
  async list(coupleId: string, date: string): Promise<DailySong[]> {
    const { data, error } = await supabase
      .from('daily_songs')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('song_date', date)
      .order('created_at');
    if (error) throw new Error(serviceError(error, 'Günün şarkısı yüklenemedi. Bağlantınızı kontrol edin.'));
    return ((data ?? []) as Record<string, unknown>[]).map(mapSong);
  },

  /** Backward-compatible helper for screens that only need one preview. */
  async get(coupleId: string, date: string, ownerId?: string): Promise<DailySong | null> {
    let query = supabase.from('daily_songs').select('*').eq('couple_id', coupleId).eq('song_date', date);
    if (ownerId) query = query.eq('owner_id', ownerId);
    const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(serviceError(error, 'Günün şarkısı yüklenemedi. Bağlantınızı kontrol edin.'));
    return data ? mapSong(data as Record<string, unknown>) : null;
  },

  async save(input: {
    ownerId: string;
    partnerId: string;
    coupleId: string;
    date: string;
    title: string;
    artist: string;
    url: string;
  }): Promise<DailySong> {
    const title = input.title.trim();
    const artist = input.artist.trim();
    const rawUrl = input.url.trim();
    if (!title || !artist || !rawUrl) throw new Error('Şarkı adı, sanatçı ve dinleme bağlantısını doldurun.');
    const url = normalizeHttpUrl(rawUrl);
    const { data, error } = await supabase
      .from('daily_songs')
      .upsert(
        {
          owner_id: input.ownerId,
          couple_id: input.coupleId,
          song_date: input.date,
          title,
          artist,
          url,
        },
        { onConflict: 'couple_id,song_date,owner_id' },
      )
      .select('*')
      .single();
    if (error || !data)
      throw new Error(serviceError(error, 'Şarkı kaydedilemedi. Eşleşmenizi ve bağlantınızı kontrol edin.'));
    const song = mapSong(data as Record<string, unknown>);
    await notificationService.notifyPartner({
      partnerId: input.partnerId,
      coupleId: input.coupleId,
      title: 'Günün şarkısı eklendi',
      body: `${song.title} · ${song.artist}`,
    });
    return song;
  },
};
