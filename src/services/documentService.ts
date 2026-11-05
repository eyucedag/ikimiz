import { supabase } from '@/src/lib/supabase';
import { notificationService } from '@/src/services/notificationService';

export interface CoupleDocument {
  id: string;
  ownerId: string;
  fileName: string;
  displayName: string;
  mimeType: string;
  storagePath: string;
  sizeBytes: number;
  createdAt: string;
  previewUrl?: string;
}

export interface CoupleDocumentLink {
  id: string;
  ownerId: string;
  displayName: string;
  url: string;
  createdAt: string;
}

const mapDocument = (row: Record<string, unknown>): CoupleDocument => ({
  id: String(row.id), ownerId: String(row.owner_id), fileName: String(row.file_name), displayName: String(row.display_name ?? row.file_name),
  mimeType: String(row.mime_type), storagePath: String(row.storage_path),
  sizeBytes: Number(row.size_bytes ?? 0), createdAt: String(row.created_at),
});

export const documentService = {
  async list(coupleId: string): Promise<CoupleDocument[]> {
    const { data, error } = await supabase.from('couple_documents').select('*')
      .eq('couple_id', coupleId).order('created_at', { ascending: false });
    if (error) throw new Error(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Dokümanlar kurulumu eksik. Supabase SQL Editor’da 20261105_shared_documents.sql kodunu çalıştırın.'
      : 'Belgeler yüklenemedi. Bağlantınızı kontrol edin.');
    const documents = ((data ?? []) as Record<string, unknown>[]).map(mapDocument);
    return Promise.all(documents.map(async (document) => {
      if (!document.mimeType.startsWith('image/')) return document;
      const { data: signed } = await supabase.storage.from('couple-documents').createSignedUrl(document.storagePath, 60 * 5);
      return { ...document, previewUrl: signed?.signedUrl };
    }));
  },

  async listLinks(coupleId: string): Promise<CoupleDocumentLink[]> {
    const { data, error } = await supabase.from('couple_document_links').select('*')
      .eq('couple_id', coupleId).order('created_at', { ascending: false });
    if (error) throw new Error(error.code === '42P01' || error.code === 'PGRST205'
      ? 'Doküman bağlantıları için gerekli SQL kurulumu eksik. Supabase SQL Editor’da 20261105_shared_document_links.sql kodunu çalıştırın.'
      : `Bağlantılar yüklenemedi: ${error.message}`);
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: String(row.id), ownerId: String(row.owner_id), displayName: String(row.display_name),
      url: String(row.url), createdAt: String(row.created_at),
    }));
  },

  async addLink(input: { ownerId: string; partnerId: string; coupleId: string; displayName: string; url: string }): Promise<CoupleDocumentLink> {
    const displayName = input.displayName.trim();
    const rawUrl = input.url.trim();
    if (!displayName) throw new Error('Bağlantının görünen adını yazın.');
    let url: URL;
    try { url = new URL(/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`); }
    catch { throw new Error('Geçerli bir bağlantı girin.'); }
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Bağlantı http:// veya https:// ile başlamalı.');
    const { data, error } = await supabase.from('couple_document_links').insert({
      owner_id: input.ownerId, couple_id: input.coupleId, display_name: displayName, url: url.toString(),
    }).select('*').single();
    if (error || !data) throw new Error(error?.code === '42P01' || error?.code === 'PGRST205'
      ? 'Doküman bağlantıları için gerekli SQL kurulumu eksik. Supabase SQL Editor’da 20261105_shared_document_links.sql kodunu çalıştırın.'
      : `Bağlantı eklenemedi: ${error?.message ?? 'Tekrar deneyin.'}`);
    const row = data as Record<string, unknown>;
    const link = { id: String(row.id), ownerId: String(row.owner_id), displayName: String(row.display_name), url: String(row.url), createdAt: String(row.created_at) };
    await notificationService.notifyPartner({ partnerId: input.partnerId, coupleId: input.coupleId, title: 'Doküman bağlantısı eklendi', body: link.displayName });
    return link;
  },

  async removeLink(link: CoupleDocumentLink): Promise<void> {
    const { data, error } = await supabase.from('couple_document_links').delete().eq('id', link.id).select('id').maybeSingle();
    if (error || !data) throw new Error(error?.message ?? 'Bağlantı kaldırılamadı. Yalnızca ekleyen kişi kaldırabilir.');
  },

  async add(input: { ownerId: string; partnerId: string; coupleId: string; fileName: string; displayName: string; mimeType: string; sizeBytes: number; content: ArrayBuffer }): Promise<CoupleDocument> {
    const safeName = input.fileName.replace(/[^\p{L}\p{N}._-]+/gu, '_').slice(-120) || 'belge';
    const storagePath = `${input.coupleId}/${input.ownerId}/${Date.now()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('couple-documents').upload(storagePath, input.content, {
      contentType: input.mimeType, cacheControl: '3600', upsert: false,
    });
    if (uploadError) throw new Error(uploadError.message.toLowerCase().includes('bucket') || uploadError.message.toLowerCase().includes('row-level security')
      ? 'Doküman deposu henüz kurulmamış. Supabase SQL Editor’da 20261105_shared_documents.sql kodunu çalıştırın.'
      : `Dosya yüklenemedi: ${uploadError.message}`);
    const { data, error } = await supabase.from('couple_documents').insert({
      owner_id: input.ownerId, couple_id: input.coupleId, file_name: input.fileName, display_name: input.displayName.trim(),
      mime_type: input.mimeType, storage_path: storagePath, size_bytes: input.sizeBytes,
    }).select('*').single();
    if (error || !data) {
      await supabase.storage.from('couple-documents').remove([storagePath]);
      throw new Error(error?.code === '42P01' || error?.code === 'PGRST205'
        ? 'Dokümanlar kurulumu eksik. Supabase SQL Editor’da 20261105_shared_documents.sql kodunu çalıştırın.'
        : 'Dosya yüklendi ama kaydı oluşturulamadı. Yeniden deneyin.');
    }
    const document = mapDocument(data as Record<string, unknown>);
    await notificationService.notifyPartner({ partnerId: input.partnerId, coupleId: input.coupleId, title: 'Ortak belge eklendi', body: document.displayName });
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
