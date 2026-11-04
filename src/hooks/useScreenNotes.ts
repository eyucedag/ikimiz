import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { screenNoteService } from '@/src/services/screenNoteService';
import { CoupleState, ScreenNote, ServiceResult } from '@/src/types';
import { useAuth } from './useAuth';
import { supabase } from '@/src/lib/supabase';

type NoteDraft = { text: string; emoji: string; backgroundColor: string; stickerUri?: string | null };

/** Ekrana Not verisi. Eşleşme bilgisi useCouple'dan parametre olarak gelir. */
export function useScreenNotes(coupleState: Pick<CoupleState, 'couple' | 'partner'>) {
  const { user } = useAuth();
  const coupleId = coupleState.couple?.id ?? null;
  const [notes, setNotes] = useState<ScreenNote[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setNotes(await screenNoteService.list(user.id, coupleId));
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [user, coupleId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    if (!coupleId) return;
    const channel = supabase.channel(`screen-notes-${coupleId}-${user?.id ?? 'guest'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'screen_notes', filter: `couple_id=eq.${coupleId}` }, () => { void refresh(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [coupleId, user?.id, refresh]);

  const latestFromPartner = useMemo(() => notes.find((n) => n.senderId !== user?.id) ?? null, [notes, user]);

  const send = useCallback(
    async (draft: NoteDraft): Promise<ServiceResult<ScreenNote>> => {
      if (!user || !coupleState.couple || !coupleState.partner) return { error: 'Not göndermek için önce partnerinizle eşleşin.' };
      const result = await screenNoteService.send({
        ...draft,
        senderId: user.id,
        senderName: user.displayName,
        coupleId: coupleState.couple.id,
        receiverId: coupleState.partner.id,
      });
      if (result.data) setNotes((prev) => [result.data!, ...prev]);
      return result;
    },
    [user, coupleState.couple, coupleState.partner],
  );

  const markRead = useCallback(async (noteId: string) => {
    const result = await screenNoteService.markRead(noteId);
    if (!result.error) setNotes((previous) => previous.map((note) => note.id === noteId ? { ...note, readAt: note.readAt ?? new Date().toISOString() } : note));
    return result;
  }, []);

  const update = useCallback(async (noteId: string, text: string, backgroundColor: string) => {
    const result = await screenNoteService.update(noteId, text, backgroundColor);
    if (result.data) setNotes((previous) => previous.map((note) => note.id === noteId ? result.data! : note));
    return result;
  }, []);

  return { notes, latestFromPartner, loading, refresh, send, markRead, update };
}
