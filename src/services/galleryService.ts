import { signStoragePaths } from '@/src/services/storageService';
import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface GalleryPhoto {
  id: string;
  ownerId: string;
  coupleId: string;
  caption: string | null;
  takenAt: string;
  mimeType: string;
  storagePath: string;
  createdAt: string;
  imageUrl: string;
}

const mapPhoto = (row: Record<string, unknown>, imageUrl: string): GalleryPhoto => ({
  id: String(row.id),
  ownerId: String(row.owner_id),
  coupleId: String(row.couple_id),
  caption: row.caption == null ? null : String(row.caption),
  takenAt: String(row.taken_at ?? row.created_at),
  mimeType: String(row.mime_type),
  storagePath: String(row.storage_path),
  createdAt: String(row.created_at),
  imageUrl,
});

export const galleryService = {
  async list(coupleId: string, limit = 500): Promise<GalleryPhoto[]> {
    const { data, error } = await supabase
      .from('couple_gallery_photos')
      .select('*')
      .eq('couple_id', coupleId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error)
      throw new Error(
        error.code === '42P01' || error.code === 'PGRST205'
          ? 'Galeri kurulumu eksik. Supabase SQL Editor’da 20261105_shared_gallery.sql kodunu çalıştırın.'
          : `Galeri yüklenemedi: ${error.message}`,
      );
    const rows = (data ?? []) as Record<string, unknown>[];
    const urls = await signStoragePaths(
      'couple-gallery',
      rows.map((row) => String(row.storage_path)),
    );
    return rows.map((row) => mapPhoto(row, urls.get(String(row.storage_path))!));
  },

  async add(input: {
    ownerId: string;
    partnerId: string;
    coupleId: string;
    caption: string;
    takenAt: string;
    mimeType: string;
    sizeBytes: number;
    content: ArrayBuffer;
  }): Promise<GalleryPhoto> {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/heic': 'heic',
    };
    const extension = extensions[input.mimeType] ?? 'jpg';
    const storagePath = `${input.coupleId}/${input.ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('couple-gallery')
      .upload(storagePath, input.content, {
        contentType: input.mimeType,
        cacheControl: '3600',
        upsert: false,
      });
    if (uploadError)
      throw new Error(
        uploadError.message.toLowerCase().includes('bucket') ||
          uploadError.message.toLowerCase().includes('row-level security')
          ? 'Galeri fotoğraf deposu hazır değil. Supabase SQL Editor’da 20261105_shared_gallery.sql kodunu çalıştırın.'
          : `Fotoğraf yüklenemedi: ${uploadError.message}`,
      );
    const { data, error } = await supabase
      .from('couple_gallery_photos')
      .insert({
        owner_id: input.ownerId,
        couple_id: input.coupleId,
        caption: input.caption.trim() || null,
        taken_at: input.takenAt,
        mime_type: input.mimeType,
        storage_path: storagePath,
        size_bytes: input.sizeBytes,
      })
      .select('*')
      .single();
    if (error || !data) {
      await supabase.storage.from('couple-gallery').remove([storagePath]);
      if (error?.code === '42703' || error?.code === 'PGRST204') {
        throw new Error(
          'Galeri veritabanı güncellemesi eksik. Supabase SQL Editor’da 20261106_gallery_caption_and_photo_date.sql kodunu çalıştırın.',
        );
      }
      throw new Error(
        error?.code === '42P01' || error?.code === 'PGRST205'
          ? 'Galeri kurulumu eksik. Supabase SQL Editor’da 20261105_shared_gallery.sql kodunu çalıştırın.'
          : `Fotoğraf kaydedilemedi: ${error?.message ?? 'Tekrar deneyin.'}`,
      );
    }
    const { data: signed, error: signedError } = await supabase.storage
      .from('couple-gallery')
      .createSignedUrl(storagePath, 60 * 60 * 24);
    if (signedError || !signed?.signedUrl)
      throw new Error('Fotoğraf yüklendi ancak önizleme açılamadı. Galeriyi yenileyin.');
    const photo = mapPhoto(data as Record<string, unknown>, signed.signedUrl);
    await notificationService.notifyPartner({
      partnerId: input.partnerId,
      coupleId: input.coupleId,
      title: 'Galeriye fotoğraf eklendi',
      body: photo.caption || 'Yeni bir fotoğraf paylaşıldı.',
    });
    return photo;
  },

  async updateCaption(photo: GalleryPhoto, caption: string, partnerId: string): Promise<GalleryPhoto> {
    const { data, error } = await supabase
      .from('couple_gallery_photos')
      .update({ caption: caption.trim() || null })
      .eq('id', photo.id)
      .select('*')
      .single();
    if (error?.code === '42501')
      throw new Error(
        'Fotoğraf yazısını düzenlemek için 20261106_gallery_caption_and_photo_date.sql kurulumunu tamamlayın.',
      );
    if (error?.code === '42703' || error?.code === 'PGRST204')
      throw new Error(
        'Galeri veritabanı güncellemesi eksik. Supabase SQL Editor’da 20261106_gallery_caption_and_photo_date.sql kodunu çalıştırın.',
      );
    if (error || !data)
      throw new Error(`Fotoğraf yazısı kaydedilemedi: ${error?.message ?? 'Tekrar deneyin.'}`);
    const updated = mapPhoto(data as Record<string, unknown>, photo.imageUrl);
    await notificationService.notifyPartner({
      partnerId,
      coupleId: photo.coupleId,
      title: 'Galeri fotoğrafı güncellendi',
      body: updated.caption || 'Bir fotoğrafın yazısı düzenlendi.',
    });
    return updated;
  },

  async remove(photo: GalleryPhoto): Promise<void> {
    const { data, error } = await supabase
      .from('couple_gallery_photos')
      .delete()
      .eq('id', photo.id)
      .select('id')
      .maybeSingle();
    if (error || !data)
      throw new Error(error?.message ?? 'Fotoğraf bulunamadı veya ortak alandan kaldırılmış.');
    const { error: storageError } = await supabase.storage.from('couple-gallery').remove([photo.storagePath]);
    if (storageError)
      throw new Error(`Fotoğraf kaydı silindi ancak depodaki dosya kaldırılamadı: ${storageError.message}`);
  },
};
