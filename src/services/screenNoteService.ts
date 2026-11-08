import { readFileBytes } from '@/src/utils/files';
import { supabase } from '@/src/lib/supabase';
import { ScreenNote, ServiceResult } from '@/src/types';
import { notificationService } from '@/src/services/notificationService';

export const SCREEN_NOTE_MAX_LENGTH = 140;

const mapNote = (row: Record<string, unknown>): ScreenNote => ({
  id: String(row.id),
  coupleId: row.couple_id == null ? null : String(row.couple_id),
  senderId: String(row.owner_id),
  receiverId: row.receiver_id == null ? null : String(row.receiver_id),
  text: String(row.text ?? ''),
  emoji: String(row.emoji ?? ''),
  backgroundColor: String(row.background_color ?? '#F2E7DB'),
  imageUrl: null,
  createdAt: String(row.created_at),
  readAt: row.read_at == null ? null : String(row.read_at),
});

export interface SendNoteInput {
  senderId: string;
  senderName: string;
  coupleId: string;
  receiverId: string;
  text: string;
  emoji: string;
  backgroundColor: string;
  stickerUri?: string | null;
}

export const screenNoteService = {
  async list(_userId: string, coupleId: string | null): Promise<ScreenNote[]> {
    if (!coupleId) return [];
    const { data, error } = await supabase
      .from('screen_notes')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return Promise.all(
      (data ?? []).map(async (row) => {
        const note = mapNote(row);
        if (row.image_path) {
          const { data: image } = await supabase.storage
            .from('screen-note-stickers')
            .createSignedUrl(row.image_path, 60 * 60 * 24 * 7);
          note.imageUrl = image?.signedUrl ?? null;
        }
        return note;
      }),
    );
  },

  async send(input: SendNoteInput): Promise<ServiceResult<ScreenNote>> {
    const text = input.text.trim();
    if (!text) return { error: 'Lütfen kısa bir not yazın.' };
    if (text.length > SCREEN_NOTE_MAX_LENGTH)
      return { error: `Not en fazla ${SCREEN_NOTE_MAX_LENGTH} karakter olabilir.` };

    const client = supabase;
    let imagePath: string | null = null;
    if (input.stickerUri) {
      const blob = await readFileBytes(input.stickerUri);
      if (blob.byteLength > 5 * 1024 * 1024) return { error: 'Sticker görseli 5 MB’tan küçük olmalı.' };
      const path = `${input.coupleId}/${input.senderId}/${Date.now()}.jpg`;
      const { error: uploadError } = await client.storage
        .from('screen-note-stickers')
        .upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (uploadError)
        return {
          error: uploadError.message.includes('bucket')
            ? 'Sticker saklama ayarı henüz kurulmamış. Supabase SQL kurulumunu çalıştırın.'
            : uploadError.message,
        };
      imagePath = path;
    }
    const { data, error } = await client
      .from('screen_notes')
      .insert({
        owner_id: input.senderId,
        couple_id: input.coupleId,
        receiver_id: input.receiverId,
        text,
        emoji: input.emoji,
        background_color: input.backgroundColor,
        image_path: imagePath,
        visibility: 'shared',
      })
      .select('*')
      .single();
    if (error) {
      if (imagePath) await client.storage.from('screen-note-stickers').remove([imagePath]);
      return { error: error.message };
    }
    let note = mapNote(data);
    if (imagePath) {
      const { data: image } = await client.storage
        .from('screen-note-stickers')
        .createSignedUrl(imagePath, 60 * 60 * 24 * 7);
      note.imageUrl = image?.signedUrl ?? null;
    }
    await notificationService.notifyPartner({
      partnerId: input.receiverId,
      coupleId: input.coupleId,
      category: 'screen_note',
      title: 'Yeni ekran notu',
      body: `${input.senderName}: ${text}`,
    });
    return { data: note };
  },

  async markRead(noteId: string): Promise<ServiceResult> {
    const { error } = await supabase.rpc('mark_screen_note_read', { p_note_id: noteId });
    return error ? { error: error.message } : {};
  },

  async update(
    noteId: string,
    textValue: string,
    backgroundColor: string,
  ): Promise<ServiceResult<ScreenNote>> {
    const text = textValue.trim();
    if (!text) return { error: 'Lütfen kısa bir not yazın.' };
    if (text.length > SCREEN_NOTE_MAX_LENGTH)
      return { error: `Not en fazla ${SCREEN_NOTE_MAX_LENGTH} karakter olabilir.` };
    const { data, error } = await supabase
      .from('screen_notes')
      .update({ text, background_color: backgroundColor, emoji: '' })
      .eq('id', noteId)
      .select('*')
      .single();
    if (error) return { error: error.message };
    if (data.receiver_id && data.couple_id) {
      await notificationService.notifyPartner({
        partnerId: data.receiver_id,
        coupleId: data.couple_id,
        category: 'screen_note',
        title: 'Ekran notu güncellendi',
        body: `Not: ${text}`,
      });
    }
    return { data: mapNote(data) };
  },
};
