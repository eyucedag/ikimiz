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
  id: String(row.id), ownerId: String(row.owner_id), coupleId: String(row.couple_id),
  date: String(row.song_date), title: String(row.title), artist: String(row.artist),
  url: String(row.url), createdAt: String(row.created_at),
});

function serviceError(error: { code?: string } | null, fallback: string) {
  return error?.code === '42P01' || error?.code === 'PGRST205'
    ? 'Günün Şarkısı tablosu hazır değil. Supabase SQL Editor’da 20261105_shared_song_of_the_day.sql dosyasını çalıştırın.'
    : fallback;
}

export const songOfTheDayService = {
  async get(coupleId: string, date: string): Promise<DailySong | null> {
    const { data, error } = await supabase.from('daily_songs').select('*')
      .eq('couple_id', coupleId).eq('song_date', date).maybeSingle();
    if (error) throw new Error(serviceError(error, 'Günün şarkısı yüklenemedi. Bağlantınızı kontrol edin.'));
    return data ? mapSong(data as Record<string, unknown>) : null;
  },

  async save(input: { ownerId: string; partnerId: string; coupleId: string; date: string; title: string; artist: string; url: string }): Promise<DailySong> {
    const title = input.title.trim();
    const artist = input.artist.trim();
    const url = input.url.trim();
    if (!title || !artist || !url) throw new Error('Şarkı adı, sanatçı ve dinleme bağlantısını doldurun.');
    if (!/^https?:\/\//i.test(url)) throw new Error('Spotify, YouTube veya başka bir müzik bağlantısını https:// ile girin.');
    const { data, error } = await supabase.from('daily_songs').upsert({
      owner_id: input.ownerId, couple_id: input.coupleId, song_date: input.date, title, artist, url,
    }, { onConflict: 'couple_id,song_date' }).select('*').single();
    if (error || !data) throw new Error(serviceError(error, 'Şarkı kaydedilemedi. Eşleşmenizi ve bağlantınızı kontrol edin.'));
    const song = mapSong(data as Record<string, unknown>);
    await notificationService.notifyPartner({
      partnerId: input.partnerId, coupleId: input.coupleId,
      title: 'Günün şarkısı güncellendi', body: `${song.title} · ${song.artist}`,
    });
    return song;
  },
};
