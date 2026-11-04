import { addMockNotification, createId, mockStore, nowIso } from '@/src/lib/mock-store';
import { isMockMode, requireSupabase } from '@/src/lib/supabase';
import { ScreenNote, ServiceResult } from '@/src/types';

export const SCREEN_NOTE_MAX_LENGTH = 140;

const mapNote = (row: any): ScreenNote => ({
  id: row.id,
  coupleId: row.couple_id,
  senderId: row.owner_id,
  receiverId: row.receiver_id,
  text: row.text,
  emoji: row.emoji,
  backgroundColor: row.background_color,
  createdAt: row.created_at,
});

export interface SendNoteInput {
  senderId: string;
  senderName: string;
  coupleId: string;
  receiverId: string;
  text: string;
  emoji: string;
  backgroundColor: string;
}

export const screenNoteService = {
  async list(userId: string, coupleId: string | null): Promise<ScreenNote[]> {
    if (!coupleId) return [];
    if (isMockMode) {
      const db = await mockStore.read();
      return db.screenNotes
        .filter((n) => n.coupleId === coupleId && (n.senderId === userId || n.receiverId === userId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const { data, error } = await requireSupabase()
      .from('screen_notes')
      .select('*')
      .eq('couple_id', coupleId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapNote);
  },

  async send(input: SendNoteInput): Promise<ServiceResult<ScreenNote>> {
    const text = input.text.trim();
    if (!text) return { error: 'Lütfen kısa bir not yazın.' };
    if (text.length > SCREEN_NOTE_MAX_LENGTH) return { error: `Not en fazla ${SCREEN_NOTE_MAX_LENGTH} karakter olabilir.` };

    if (isMockMode) {
      return mockStore.update((db) => {
        const note: ScreenNote = {
          id: createId(),
          coupleId: input.coupleId,
          senderId: input.senderId,
          receiverId: input.receiverId,
          text,
          emoji: input.emoji,
          backgroundColor: input.backgroundColor,
          createdAt: nowIso(),
        };
        db.screenNotes.unshift(note);
        // Partnere bildirim simülasyonu
        addMockNotification(db, input.receiverId, 'screen_note', 'Yeni ekran notu', `${input.senderName}: ${input.emoji} ${text}`);
        return { data: note };
      });
    }

    const client = requireSupabase();
    const { data, error } = await client
      .from('screen_notes')
      .insert({
        owner_id: input.senderId,
        couple_id: input.coupleId,
        receiver_id: input.receiverId,
        text,
        emoji: input.emoji,
        background_color: input.backgroundColor,
        visibility: 'shared',
      })
      .select('*')
      .single();
    if (error) return { error: error.message };
    await client.from('notifications').insert({
      owner_id: input.receiverId,
      couple_id: input.coupleId,
      category: 'screen_note',
      title: 'Yeni ekran notu',
      body: `${input.senderName}: ${input.emoji} ${text}`,
    });
    return { data: mapNote(data) };
  },
};
