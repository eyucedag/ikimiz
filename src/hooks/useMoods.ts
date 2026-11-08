import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { moodService, MoodScope } from '@/src/services/moodService';
import { CoupleState, ServiceResult } from '@/src/types';
import { MoodDraft, MoodEntry } from '@/src/types/mood';
import { getLocalMoodDate, getMoodHistoryStartDate } from '@/src/utils/mood';
import { useAuth } from './useAuth';

interface MoodState {
  scope: string;
  history: MoodEntry[];
  loading: boolean;
  error: string | null;
}

/** Günlük kayıtlar her zaman mevcut aktif partnerle paylaşılır. */
export function useMoods(coupleState: Pick<CoupleState, 'couple' | 'partner'>) {
  const { user } = useAuth();
  const ownerId = user?.id ?? null;
  const coupleId = coupleState.couple?.id ?? null;
  const partnerId = coupleState.partner?.id ?? null;
  const isMember =
    !!ownerId &&
    !!partnerId &&
    partnerId !== ownerId &&
    !coupleState.couple?.endedAt &&
    !!coupleState.couple?.memberIds.includes(ownerId) &&
    !!coupleState.couple?.memberIds.includes(partnerId);
  const scope = useMemo<MoodScope | null>(
    () => (ownerId && coupleId && partnerId && isMember ? { ownerId, coupleId, partnerId } : null),
    [ownerId, coupleId, partnerId, isMember],
  );
  const scopeKey = `${ownerId ?? ''}:${scope?.coupleId ?? ''}:${scope?.partnerId ?? ''}`;
  const [state, setState] = useState<MoodState>({
    scope: scopeKey,
    history: [],
    loading: !!scope,
    error: null,
  });
  const [savingScope, setSavingScope] = useState<string | null>(null);
  const mounted = useRef(true);
  const currentScope = useRef(scopeKey);
  const scopeGeneration = useRef(0);
  const requestId = useRef(0);
  const pendingRefresh = useRef<{ scope: string; id: number; promise: Promise<void> } | null>(null);
  const pendingSave = useRef<{ scope: string; generation: number } | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  useEffect(() => {
    currentScope.current = scopeKey;
    scopeGeneration.current += 1;
    requestId.current += 1;
    pendingRefresh.current = null;
    setState({ scope: scopeKey, history: [], loading: !!scope, error: null });
  }, [scopeKey, scope]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!scope || !mounted.current || currentScope.current !== scopeKey) return;
    if (pendingSave.current?.scope === scopeKey && pendingSave.current.generation === scopeGeneration.current)
      return;
    if (pendingRefresh.current?.scope === scopeKey) return pendingRefresh.current.promise;
    const id = ++requestId.current;
    const promise = (async () => {
      try {
        const history = await moodService.list(scope);
        if (mounted.current && currentScope.current === scopeKey && requestId.current === id) {
          setState({ scope: scopeKey, history, loading: false, error: null });
        }
      } catch (error) {
        if (mounted.current && currentScope.current === scopeKey && requestId.current === id) {
          setState((previous) => ({
            scope: scopeKey,
            history: previous.scope === scopeKey ? previous.history : [],
            loading: false,
            error:
              error instanceof Error ? error.message : 'Ruh halleri yüklenemedi. Lütfen yeniden deneyin.',
          }));
        }
      } finally {
        if (pendingRefresh.current?.id === id) pendingRefresh.current = null;
      }
    })();
    pendingRefresh.current = { scope: scopeKey, id, promise };
    return promise;
  }, [scope, scopeKey]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      // Realtime yayını gerektirmeden partnerin kaydını ve gün değişimini yeniler.
      const interval = scope
        ? setInterval(() => {
            void refresh();
          }, 15_000)
        : null;
      return () => {
        if (interval) clearInterval(interval);
        requestId.current += 1;
        pendingRefresh.current = null;
      };
    }, [refresh, scope]),
  );

  const save = useCallback(
    async (draft: MoodDraft): Promise<ServiceResult<MoodEntry>> => {
      if (!ownerId) return { error: 'Oturum bulunamadı. Lütfen yeniden giriş yapın.' };
      if (!scope || currentScope.current !== scopeKey)
        return { error: 'Ruh halinizi paylaşmak için önce partnerinizle eşleşin.' };
      if (pendingSave.current) return { error: 'Ruh haliniz kaydediliyor. Lütfen bekleyin.' };
      const operation = { scope: scopeKey, generation: scopeGeneration.current };
      pendingSave.current = operation;
      requestId.current += 1;
      pendingRefresh.current = null;
      setSavingScope(scopeKey);
      try {
        const result = await moodService.save({ ...scope, ...draft });
        if (
          !mounted.current ||
          currentScope.current !== scopeKey ||
          scopeGeneration.current !== operation.generation
        ) {
          return { error: 'Eşleşme veya oturum değişti. Lütfen sayfayı yenileyin.' };
        }
        setState((previous) => {
          const history = previous.scope === scopeKey ? previous.history : [];
          return {
            scope: scopeKey,
            loading: false,
            error: result.error ?? null,
            history: result.data
              ? [
                  result.data,
                  ...history.filter(
                    (entry) =>
                      entry.id !== result.data!.id &&
                      !(entry.ownerId === result.data!.ownerId && entry.date === result.data!.date),
                  ),
                ].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt))
              : history,
          };
        });
        return result;
      } catch {
        const error = 'Ruh haliniz kaydedilemedi. Lütfen yeniden deneyin.';
        if (
          mounted.current &&
          currentScope.current === scopeKey &&
          scopeGeneration.current === operation.generation
        ) {
          setState((previous) => ({ ...previous, loading: false, error }));
        }
        return { error };
      } finally {
        if (pendingSave.current === operation) pendingSave.current = null;
        if (mounted.current) setSavingScope((previous) => (previous === scopeKey ? null : previous));
      }
    },
    [ownerId, scope, scopeKey],
  );

  const todayDate = getLocalMoodDate();
  const historyStart = getMoodHistoryStartDate();
  const history =
    state.scope === scopeKey && scope
      ? state.history.filter(
          (entry) =>
            entry.coupleId === scope.coupleId &&
            (entry.ownerId === scope.ownerId || entry.ownerId === scope.partnerId) &&
            entry.date >= historyStart &&
            entry.date <= todayDate,
        )
      : [];
  return {
    today: history.find((entry) => entry.ownerId === ownerId && entry.date === todayDate) ?? null,
    partnerToday: history.find((entry) => entry.ownerId === partnerId && entry.date === todayDate) ?? null,
    history,
    loading: !!scope && (state.scope !== scopeKey || state.loading),
    saving: savingScope === scopeKey,
    error: state.scope === scopeKey ? state.error : null,
    refresh,
    save,
  };
}
