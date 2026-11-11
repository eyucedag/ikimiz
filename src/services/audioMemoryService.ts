import { signStoragePaths } from '@/src/services/storageService';
import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface AudioMemory {
  id: string;
  ownerId: string;
  coupleId: string;
  title: string | null;
  storagePath: string;
  mimeType: string;
  durationSeconds: number;
  sizeBytes: number;
  createdAt: string;
  audioUrl: string;
}

const mapMemory = (row: Record<string, unknown>, audioUrl: string): AudioMemory => ({
  id: String(row.id),
  ownerId: String(row.owner_id),
  coupleId: String(row.couple_id),
  title: row.title == null ? null : String(row.title),
  storagePath: String(row.storage_path),
  mimeType: String(row.mime_type),
  durationSeconds: Number(row.duration_seconds),
  sizeBytes: Number(row.size_bytes),
  createdAt: String(row.created_at),
  audioUrl,
});

const storage = supabase.storage.from('couple-audio-memories');

export const audioMemoryService = {
  async list(coupleId: string, limit = 500): Promise<AudioMemory[]> {
    const { data, error } = await supabase
      .from('couple_audio_memories')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error)
      throw new Error(
        error.code === '42P01' || error.code === 'PGRST205'
          ? 'Sesli Anılar kurulumu eksik. Supabase SQL Editor’da 20261105_shared_audio_memories.sql kodunu çalıştırın.'
          : `Sesli anılar yüklenemedi: ${error.message}`,
      );
    const rows = (data ?? []) as Record<string, unknown>[];
    const urls = await signStoragePaths(
      'couple-audio-memories',
      rows.map((row) => String(row.storage_path)),
    );
    return rows.map((row) => mapMemory(row, urls.get(String(row.storage_path))!));
  },

  async add(input: {
    ownerId: string;
    partnerId: string;
    coupleId: string;
    title: string;
    durationSeconds: number;
    sizeBytes: number;
    content: ArrayBuffer;
  }): Promise<AudioMemory> {
    const storagePath = `${input.coupleId}/${input.ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.m4a`;
    const { error: uploadError } = await storage.upload(storagePath, input.content, {
      contentType: 'audio/mp4',
      cacheControl: '3600',
      upsert: false,
    });
    if (uploadError)
      throw new Error(
        uploadError.message.toLowerCase().includes('bucket') ||
          uploadError.message.toLowerCase().includes('row-level security')
          ? 'Sesli anı deposu hazır değil. Supabase SQL Editor’da 20261105_shared_audio_memories.sql kodunu çalıştırın.'
          : `Ses kaydı yüklenemedi: ${uploadError.message}`,
      );

    const { data, error } = await supabase
      .from('couple_audio_memories')
      .insert({
        owner_id: input.ownerId,
        couple_id: input.coupleId,
        title: input.title.trim() || null,
        storage_path: storagePath,
        mime_type: 'audio/mp4',
        duration_seconds: Math.min(180, Math.max(1, Math.round(input.durationSeconds))),
        size_bytes: input.sizeBytes,
      })
      .select('*')
      .single();
    if (error || !data) {
      await storage.remove([storagePath]);
      if (error?.code === '42P01' || error?.code === 'PGRST205') {
        throw new Error(
          'Sesli Anılar kurulumu eksik. Supabase SQL Editor’da 20261105_shared_audio_memories.sql kodunu çalıştırın.',
        );
      }
      throw new Error(`Ses kaydı kaydedilemedi: ${error?.message ?? 'Tekrar deneyin.'}`);
    }

    const { data: signed, error: signedError } = await storage.createSignedUrl(storagePath, 60 * 60 * 24);
    if (signedError || !signed?.signedUrl)
      throw new Error('Kayıt yüklendi ancak dinleme bağlantısı açılamadı. Listeyi yenileyin.');
    const memory = mapMemory(data as Record<string, unknown>, signed.signedUrl);
    await notificationService.notifyPartner({
      partnerId: input.partnerId,
      coupleId: input.coupleId,
      title: 'Yeni bir sesli anı paylaşıldı',
      body: memory.title || 'Partnerin sana bir sesli anı bıraktı.',
    });
    return memory;
  },

  async remove(memory: AudioMemory): Promise<void> {
    const { data, error } = await supabase
      .from('couple_audio_memories')
      .delete()
      .eq('id', memory.id)
      .select('id')
      .maybeSingle();
    if (error || !data)
      throw new Error(error?.message ?? 'Sesli anı bulunamadı veya ortak alandan kaldırılmış.');
    const { error: storageError } = await storage.remove([memory.storagePath]);
    if (storageError)
      throw new Error(`Kayıt silindi ancak depodaki ses dosyası kaldırılamadı: ${storageError.message}`);
  },
};
