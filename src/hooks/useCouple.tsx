import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { coupleService } from '@/src/services/coupleService';
import { CoupleState, Invitation, ServiceResult } from '@/src/types';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from './useAuth';

const EMPTY: CoupleState = { couple: null, partner: null, pendingInvitation: null };
interface CoupleValue extends CoupleState {
  loading: boolean;
  error: string | null;
  isPaired: boolean;
  refresh: () => Promise<CoupleState>;
  createInvitation: () => Promise<ServiceResult<Invitation>>;
  acceptInvitation: (code: string) => Promise<ServiceResult>;
  rejectInvitation: (code: string) => Promise<ServiceResult>;
  cancelInvitation: () => Promise<ServiceResult>;
  endCouple: () => Promise<ServiceResult>;
}
const CoupleContext = createContext<CoupleValue | null>(null);

/** One shared couple snapshot prevents screens from disagreeing about the active partner. */
export function CoupleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<CoupleState>(EMPTY);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const pending = useRef<Promise<CoupleState> | null>(null);
  const snapshot = useRef(state);
  snapshot.current = state;

  const refresh = useCallback((): Promise<CoupleState> => {
    if (!userId) return Promise.resolve(EMPTY);
    if (pending.current) return pending.current;
    const request = coupleService
      .getState(userId)
      .then((next) => {
        if (mounted.current) {
          setState(next);
          setError(null);
        }
        return next;
      })
      .catch((cause: unknown) => {
        if (mounted.current) setError(cause instanceof Error ? cause.message : 'Eşleşme yüklenemedi.');
        return snapshot.current;
      })
      .finally(() => {
        pending.current = null;
        if (mounted.current) setLoading(false);
      });
    pending.current = request;
    return request;
  }, [userId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const listener = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => {
      mounted.current = false;
      listener.remove();
    };
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`couple-state-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couple_members', filter: `user_id=eq.${userId}` },
        () => {
          void refresh();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'invitations', filter: `inviter_id=eq.${userId}` },
        () => {
          void refresh();
        },
      );
    if (state.couple?.id)
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${state.couple.id}` },
        () => {
          void refresh();
        },
      );
    if (state.partner?.id)
      channel.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${state.partner.id}` },
        () => {
          void refresh();
        },
      );
    channel.subscribe();
    // Poll only in the foreground to recover if Realtime was disconnected.
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, 30_000);
    return () => {
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [userId, state.couple?.id, state.partner?.id, refresh]);

  const run = useCallback(
    async <T,>(action: () => Promise<ServiceResult<T>>): Promise<ServiceResult<T>> => {
      try {
        const result = await action();
        if (!result.error) await refresh();
        return result;
      } catch (cause) {
        return { error: cause instanceof Error ? cause.message : 'İşlem tamamlanamadı. Yeniden deneyin.' };
      }
    },
    [refresh],
  );

  const value = useMemo<CoupleValue>(() => {
    const noUser = () => Promise.resolve({ error: 'Oturum bulunamadı.' });
    return {
      ...state,
      loading,
      error,
      isPaired: !!state.couple,
      refresh,
      createInvitation: () => (user ? run(() => coupleService.createInvitation(user)) : noUser()),
      acceptInvitation: (code) =>
        userId ? run(() => coupleService.acceptInvitation(userId, code)) : noUser(),
      rejectInvitation: (code) => (userId ? run(() => coupleService.rejectInvitation(code)) : noUser()),
      cancelInvitation: () => (userId ? run(() => coupleService.cancelInvitation(userId)) : noUser()),
      endCouple: () => (userId ? run(() => coupleService.endCouple(userId)) : noUser()),
    };
  }, [state, loading, error, refresh, run, user, userId]);
  return <CoupleContext.Provider value={value}>{children}</CoupleContext.Provider>;
}

export function useCouple(): CoupleValue {
  const value = useContext(CoupleContext);
  if (!value) throw new Error('useCouple, CoupleProvider içinde kullanılmalıdır.');
  return value;
}
