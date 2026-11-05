import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface CoupleDocument {
  id: string;
  ownerId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  createdAt: string;
}

const mapDocument = (row: Record<string, unknown>): CoupleDocument => ({
  id: String(row.id), ownerId: String(row.owner_id), fileName: String(row.file_name),
  mimeType: String(row.mime_type), storagePath: String(row.storage_path),
  sizeBytes: Number(row.size_bytes ?? 0), createdAt: String(row.created_at),
});

export const documentService = {
  async list(coupleId: string): Promise<CoupleDocument[]> {
    const { data, error } = await supabase.from('couple_documents').select('*')
      .eq('couple_id', coupleId).order('created_at', { ascending: false });
    if (error) throw new Error(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Önemli Belgeler kurulumu eksik. Supabase SQL Editor’da 20261105_shared_documents.sql kodunu çalıştırın.'
      : 'Belgeler yüklenemedi. Bağlantınızı kontrol edin.');
    return ((data ?? []) as Record<string, unknown>[]).map(mapDocument);
  },

  async add(input: { ownerId: string; partnerId: string; coupleId: string; fileName: string; mimeType: string; sizeBytes: number; content: ArrayBuffer }): Promise<CoupleDocument> {
    const safeName = input.fileName.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-120) || 'belge';
    const storagePath = `${input.coupleId}/${input.ownerId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('couple-documents').upload(storagePath, input.content, {
      contentType: input.mimeType, cacheControl: '3600', upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message.toLowerCase().includes('bucket') || uploadError.message.toLowerCase().includes('row-level security')
      ? 'Belge deposu henüz kurulmamış. Supabase SQL Editor’da 20261105_shared_documents.sql kodunu çalıştırın.'
      : `Dosya yüklenemedi: ${uploadError.message}`);
    const { data, error } = await supabase.from('couple_documents').insert({
      owner_id: input.ownerId, couple_id: input.coupleId, file_name: input.fileName,
      mime_type: input.mimeType, storage_path: storagePath, size_bytes: input.sizeBytes,
    }).select('*').single();
    if (error || !data) {
      await supabase.storage.from('couple-documents').remove([storagePath]);
      throw new Error(error?.code === '42P01' || error?.code === 'PGRST205'
        ? 'Önemli Belgeler kurulumu eksik. Supabase SQL Editor’da 20261105_shared_documents.sql kodunu çalıştırın.'
        : 'Dosya yüklendi ama kaydı oluşturulamadı. Yeniden deneyin.');
    }
    const document = mapDocument(data as Record<string, unknown>);
    await notificationService.notifyPartner({ partnerId: input.partnerId, coupleId: input.coupleId, title: 'Ortak belge eklendi', body: document.fileName });
    return document;
  },

  async openUrl(storagePath: string): Promise<string> {
    const { data, error } = await supabase.storage.from('couple-documents').createSignedUrl(storagePath, 60 * 5);
    if (error || !data?.signedUrl) throw new Error('Belge bağlantısı oluşturulamadı.');
    return data.signedUrl;
  },

  async remove(document: CoupleDocument): Promise<void> {
    const { error: storageError } = await supabase.storage.from('couple-documents').remove([document.storagePath]);
    if (storageError) throw new Error('Belge dosyası kaldırılamadı.');
    const { data, error } = await supabase.from('couple_documents').delete().eq('id', document.id).select('id').maybeSingle();
    if (error || !data) throw new Error('Belge kaydı kaldırılamadı. Yalnızca ekleyen kişi kaldırabilir.');
  },
};
