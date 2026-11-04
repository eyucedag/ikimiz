import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { coupleService } from '@/src/services/coupleService';
import { CoupleState, ServiceResult } from '@/src/types';
import { useAuth } from './useAuth';

const EMPTY: CoupleState = { couple: null, partner: null, pendingInvitation: null };

/** Eşleşme durumu; ekran her odaklandığında yenilenir. */
export function useCouple() {
  const { user } = useAuth();
  const [state, setState] = useState<CoupleState>(EMPTY);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setState(EMPTY);
      setLoading(false);
      return EMPTY;
    }
    try {
      const next = await coupleService.getState(user.id);
      setState(next);
      return next;
    } catch {
      return EMPTY;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const run = useCallback(
    async (action: () => Promise<ServiceResult<any>>) => {
      const result = await action();
      await refresh();
      return result;
    },
    [refresh],
  );

  const noUser: ServiceResult = { error: 'Oturum bulunamadı.' };

  return {
    ...state,
    isPaired: !!state.couple,
    loading,
    refresh,
    createInvitation: () => (user ? run(() => coupleService.createInvitation(user)) : Promise.resolve(noUser)),
    acceptInvitation: (code: string) => (user ? run(() => coupleService.acceptInvitation(user.id, code)) : Promise.resolve(noUser)),
    rejectInvitation: (code: string) => run(() => coupleService.rejectInvitation(code)),
    cancelInvitation: () => (user ? run(() => coupleService.cancelInvitation(user.id)) : Promise.resolve(noUser)),
    endCouple: () => (user ? run(() => coupleService.endCouple(user.id)) : Promise.resolve(noUser)),
    simulatePartnerAccept: () => (user ? run(() => coupleService.simulatePartnerAccept(user.id)) : Promise.resolve(noUser)),
  };
}
