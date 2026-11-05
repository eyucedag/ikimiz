import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface GalleryPhoto {
  id: string;
  ownerId: string;
  coupleId: string;
  caption: string | null;
  mimeType: string;
  storagePath: string;
  createdAt: string;
  imageUrl: string;
}

const mapPhoto = (row: Record<string, unknown>, imageUrl: string): GalleryPhoto => ({
  id: String(row.id), ownerId: String(row.owner_id), coupleId: String(row.couple_id),
  caption: row.caption == null ? null : String(row.caption), mimeType: String(row.mime_type),
  storagePath: String(row.storage_path), createdAt: String(row.created_at), imageUrl,
});

export const galleryService = {
  async list(coupleId: string): Promise<GalleryPhoto[]> {
    const { data, error } = await supabase.from('couple_gallery_photos').select('*')
      .eq('couple_id', coupleId).order('created_at', { ascending: false });
    if (error) throw new Error(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Galeri kurulumu eksik. Supabase SQL Editor’da 20261105_shared_gallery.sql kodunu çalıştırın.'
      : `Galeri yüklenemedi: ${error.message}`);
    return Promise.all(((data ?? []) as Record<string, unknown>[]).map(async (row) => {
      const { data: signed, error: signedError } = await supabase.storage.from('couple-gallery')
        .createSignedUrl(String(row.storage_path), 60 * 60 * 24);
      if (signedError || !signed?.signedUrl) throw new Error('Bir fotoğrafın görüntüleme bağlantısı oluşturulamadı.');
      return mapPhoto(row, signed.signedUrl);
    }));
  },

  async add(input: { ownerId: string; partnerId: string; coupleId: string; caption: string; mimeType: string; sizeBytes: number; content: ArrayBuffer }): Promise<GalleryPhoto> {
    const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' };
    const extension = extensions[input.mimeType] ?? 'jpg';
    const storagePath = `${input.coupleId}/${input.ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('couple-gallery').upload(storagePath, input.content, {
      contentType: input.mimeType, cacheControl: '3600', upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message.toLowerCase().includes('bucket') || uploadError.message.toLowerCase().includes('row-level security')
      ? 'Galeri fotoğraf deposu hazır değil. Supabase SQL Editor’da 20261105_shared_gallery.sql kodunu çalıştırın.'
      : `Fotoğraf yüklenemedi: ${uploadError.message}`);
    const { data, error } = await supabase.from('couple_gallery_photos').insert({
      owner_id: input.ownerId, couple_id: input.coupleId, caption: input.caption.trim() || null,
      mime_type: input.mimeType, storage_path: storagePath, size_bytes: input.sizeBytes,
    }).select('*').single();
    if (error || !data) {
      await supabase.storage.from('couple-gallery').remove([storagePath]);
      throw new Error(error?.code === '42P01' || error?.code === 'PGRST205'
        ? 'Galeri kurulumu eksik. Supabase SQL Editor’da 20261105_shared_gallery.sql kodunu çalıştırın.'
        : `Fotoğraf kaydedilemedi: ${error?.message ?? 'Tekrar deneyin.'}`);
    }
    const { data: signed, error: signedError } = await supabase.storage.from('couple-gallery').createSignedUrl(storagePath, 60 * 60 * 24);
    if (signedError || !signed?.signedUrl) throw new Error('Fotoğraf yüklendi ancak önizleme açılamadı. Galeriyi yenileyin.');
    const photo = mapPhoto(data as Record<string, unknown>, signed.signedUrl);
    await notificationService.notifyPartner({ partnerId: input.partnerId, coupleId: input.coupleId, title: 'Galeriye fotoğraf eklendi', body: photo.caption || 'Yeni bir fotoğraf paylaşıldı.' });
    return photo;
  },

  async remove(photo: GalleryPhoto): Promise<void> {
    const { data, error } = await supabase.from('couple_gallery_photos').delete().eq('id', photo.id).select('id').maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'Fotoğrafı yalnızca ekleyen kişi kaldırabilir.');
    const { error: storageError } = await supabase.storage.from('couple-gallery').remove([photo.storagePath]);
    if (storageError) throw new Error(`Fotoğraf kaydı silindi ancak depodaki dosya kaldırılamadı: ${storageError.message}`);
  },
};
