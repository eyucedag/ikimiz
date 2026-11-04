import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { screenNoteService } from '@/src/services/screenNoteService';
import { CoupleState, ScreenNote, ServiceResult } from '@/src/types';
import { useAuth } from './useAuth';

type NoteDraft = { text: string; emoji: string; backgroundColor: string };

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

  return { notes, latestFromPartner, loading, refresh, send };
}
