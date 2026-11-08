import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { CoupleLocation, CoupleSteps, presenceService } from '@/src/services/presenceService';
import { supabase } from '@/src/lib/supabase';
import { createSerialQueue } from '@/src/utils/async';
import { bearingBetween, distanceMeters, locationIsFresh } from '@/src/utils/location';
import { useAuth } from './useAuth';
import { useCouple } from './useCouple';
import { useLocalDate } from './useLocalDate';

interface PresenceValue {
  sharing: boolean;
  starting: boolean;
  anySharing: boolean;
  bothSharing: boolean;
  angle: number | null;
  error: string;
  stepsError: string;
  steps: CoupleSteps[];
  start: () => Promise<void>;
  stop: () => void;
}
const PresenceContext = createContext<PresenceValue | null>(null);

/** The only owner of location/sensor subscriptions for the signed-in couple. */
export function CouplePresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { couple, partner } = useCouple();
  const userId = user?.id;
  const coupleId = couple?.id;
  const partnerId = partner?.id;
  const day = useLocalDate();
  const [locations, setLocations] = useState<CoupleLocation[]>([]);
  const [steps, setSteps] = useState<CoupleSteps[]>([]);
  const [sharing, setSharing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [stepsError, setStepsError] = useState('');
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [loadedDay, setLoadedDay] = useState('');
  const loadedDayRef = useRef('');
  const [now, setNow] = useState(() => Date.now());
  const enabled = useRef(false);
  const directionGeneration = useRef(0);
  const latestPosition = useRef<Location.LocationObject | null>(null);
  const locationWatcher = useRef<Location.LocationSubscription | null>(null);
  const headingWatcher = useRef<Location.LocationSubscription | null>(null);
  const initializing = useRef<Promise<void> | null>(null);
  const permissionRequesting = useRef(false);
  const activeWaiter = useRef<(() => void) | null>(null);
  const alive = useRef(true);
  const active = useRef(foreground);
  const locationGeneration = useRef(0);
  const lastWrite = useRef(0);
  const count = useRef(0);
  const enqueueLocation = useRef(createSerialQueue()).current;
  const enqueueSteps = useRef(createSerialQueue()).current;

  const publish = useCallback(
    (force = false) => {
      const position = latestPosition.current;
      if (!userId || !coupleId || !active.current || !position) return;
      if (!force && Date.now() - lastWrite.current < 10_000) return;
      lastWrite.current = Date.now();
      const directionEnabled = enabled.current;
      const values = {
        userId,
        coupleId,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        directionEnabled,
      };
      const own = { ...values, updatedAt: new Date().toISOString() };
      setLocations((rows) => [...rows.filter((row) => row.userId !== userId), own]);
      void enqueueLocation(() => presenceService.updateLocation(values))
        .then(() => {
          if (alive.current) setError('');
        })
        .catch(() => {
          if (alive.current) setError('Konum güncellenemedi. Bağlantınızı kontrol edin.');
        });
    },
    [coupleId, userId, enqueueLocation],
  );

  const ensureLocation = useCallback((): Promise<void> => {
    if (initializing.current) return initializing.current;
    if (locationWatcher.current || !userId || !coupleId) return Promise.resolve();
    const generation = locationGeneration.current;
    const current = () => alive.current && active.current && locationGeneration.current === generation;
    const operation = (async () => {
      permissionRequesting.current = true;
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!alive.current || locationGeneration.current !== generation) return;
        if (!permission.granted) throw new Error('Konum izni gerekli.');
        if (!active.current) {
          await new Promise<void>((resolve) => {
            activeWaiter.current = resolve;
          });
        }
      } finally {
        permissionRequesting.current = false;
      }
      if (!current()) return;
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 10_000, distanceInterval: 25 },
        (position) => {
          if (!current()) return;
          latestPosition.current = position;
          publish();
        },
        () => {
          if (current()) {
            latestPosition.current = null;
            setError('Konum alınamıyor. Konum servislerini kontrol edin.');
          }
        },
      );
      if (!current()) {
        watcher.remove();
        return;
      }
      locationWatcher.current = watcher;
    })().finally(() => {
      if (initializing.current === operation) initializing.current = null;
    });
    initializing.current = operation;
    return operation;
  }, [userId, coupleId, publish]);

  const stop = useCallback(() => {
    directionGeneration.current += 1;
    enabled.current = false;
    headingWatcher.current?.remove();
    headingWatcher.current = null;
    locationGeneration.current += 1;
    initializing.current = null;
    locationWatcher.current?.remove();
    locationWatcher.current = null;
    latestPosition.current = null;
    setSharing(false);
    setStarting(false);
    setHeading(null);
    setError('');
    if (userId && coupleId) {
      void enqueueLocation(() => presenceService.clearLocation(userId, coupleId)).catch(() => undefined);
    }
  }, [coupleId, enqueueLocation, userId]);

  const start = useCallback(async () => {
    if (!userId || !coupleId || enabled.current || !active.current) return;
    const generation = ++directionGeneration.current;
    enabled.current = true;
    setSharing(true);
    setStarting(true);
    setError('');
    const current = () => alive.current && active.current && generation === directionGeneration.current;
    try {
      await ensureLocation();
      if (!current()) return;
      publish(true);
      // A phone without a compass can still share its position.
      try {
        const watcher = await Location.watchHeadingAsync((value) => {
          if (current()) setHeading(value.trueHeading >= 0 ? value.trueHeading : value.magHeading);
        });
        if (current()) headingWatcher.current = watcher;
        else watcher.remove();
      } catch {
        if (current()) setError('Bu cihazda yön sensörü kullanılamıyor.');
      }
    } catch (cause) {
      if (alive.current && generation === directionGeneration.current) {
        enabled.current = false;
        setSharing(false);
        setError(cause instanceof Error ? cause.message : 'Konum açılamadı. Yeniden deneyin.');
      }
    } finally {
      if (alive.current && generation === directionGeneration.current) setStarting(false);
    }
  }, [userId, coupleId, ensureLocation, publish]);

  useEffect(() => {
    alive.current = true;
    const suspend = () => {
      active.current = false;
      setForeground(false);
      // Android may background the host Activity while its runtime permission sheet is open.
      // Keep the user's explicit start request and resume it after the sheet closes.
      if (permissionRequesting.current) return;
      locationGeneration.current += 1;
      initializing.current = null;
      stop();
      latestPosition.current = null;
    };
    const resume = () => {
      active.current = true;
      setForeground(true);
      setNow(Date.now());
      activeWaiter.current?.();
      activeWaiter.current = null;
    };
    if (active.current) resume();
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') resume();
      // iOS briefly becomes inactive for permission dialogs; only leaving the app ends sharing.
      if (state === 'background') {
        suspend();
        setForeground(false);
      }
    });
    const timer = setInterval(() => {
      if (active.current) {
        setNow(Date.now());
        publish();
      }
    }, 10_000);
    return () => {
      alive.current = false;
      listener.remove();
      clearInterval(timer);
      activeWaiter.current?.();
      activeWaiter.current = null;
      suspend();
    };
  }, [coupleId, userId, stop, publish]);

  useEffect(() => {
    if (!userId || !coupleId || !partnerId || !foreground) return;
    let current = true;
    const refreshLocations = async () => {
      try {
        const rows = await presenceService.locations(coupleId);
        if (current)
          setLocations((previous) => {
            const local = previous.find((row) => row.userId === userId);
            // A delayed server snapshot must not undo a local direction toggle.
            return local ? [...rows.filter((row) => row.userId !== userId), local] : rows;
          });
      } catch {
        /* Retain last known locations; freshness checks expire them. */
      }
    };
    const refreshSteps = async () => {
      try {
        const rows = await presenceService.steps(coupleId, day);
        if (!current) return;
        const stored = rows.find((row) => row.userId === userId)?.steps ?? 0;
        if (loadedDayRef.current !== day) count.current = stored;
        else count.current = Math.max(count.current, stored);
        loadedDayRef.current = day;
        setSteps(rows);
        setLoadedDay(day);
      } catch {
        if (current) setStepsError('Adım sayısı yüklenemedi.');
      }
    };
    void refreshLocations();
    void refreshSteps();
    void Pedometer.isAvailableAsync()
      .then(async (available) => {
        if (!available || !current) return;
        const permission = await Pedometer.requestPermissionsAsync();
        if (current) {
          setMotionAllowed(permission.granted);
          if (!permission.granted) setStepsError('Adım saymak için hareket izni gerekli.');
        }
      })
      .catch(() => {
        if (current) setStepsError('Bu cihazda adım sayar kullanılamıyor.');
      });
    const channel = presenceService.channel(coupleId, 'couple_live_locations', () => {
      void refreshLocations();
    });
    const stepsChannel = presenceService.channel(coupleId, 'couple_daily_steps', () => {
      void refreshSteps();
    });
    const timer = setInterval(() => {
      void refreshLocations();
    }, 15_000);
    return () => {
      current = false;
      clearInterval(timer);
      void supabase.removeChannel(channel);
      void supabase.removeChannel(stepsChannel);
    };
  }, [userId, coupleId, partnerId, day, foreground]);

  const mine = locations.find((row) => row.userId === userId);
  const theirs = locations.find((row) => row.userId === partnerId);
  const nearby =
    !!mine &&
    !!theirs &&
    locationIsFresh(mine.updatedAt, now, 30_000) &&
    locationIsFresh(theirs.updatedAt, now, 30_000) &&
    distanceMeters(mine, theirs) <= 40;

  useEffect(() => {
    if (!userId || !coupleId || !foreground || !nearby || !motionAllowed || loadedDay !== day) return;
    const base = count.current;
    let latest = base;
    let saved = base;
    const flush = () => {
      if (latest <= saved) return;
      const value = latest;
      saved = value;
      void enqueueSteps(() => presenceService.saveSteps(coupleId, userId, day, value)).catch(() => {
        saved = Math.min(saved, value - 1);
        if (alive.current) setStepsError('Adım sayısı kaydedilemedi.');
      });
    };
    const watcher = Pedometer.watchStepCount(({ steps: sessionSteps }) => {
      latest = base + sessionSteps;
      count.current = latest;
      setSteps((rows) => [
        ...rows.filter((row) => row.userId !== userId),
        { userId, coupleId, localDate: day, steps: latest },
      ]);
    });
    const timer = setInterval(flush, 5_000);
    return () => {
      watcher.remove();
      clearInterval(timer);
      flush();
    };
  }, [userId, coupleId, foreground, nearby, motionAllowed, loadedDay, day, enqueueSteps]);

  const bothSharing =
    sharing &&
    !!mine?.directionEnabled &&
    !!theirs?.directionEnabled &&
    locationIsFresh(mine.updatedAt, now) &&
    locationIsFresh(theirs.updatedAt, now);
  const value = useMemo<PresenceValue>(
    () => ({
      sharing,
      starting,
      bothSharing,
      anySharing: sharing || (!!theirs?.directionEnabled && locationIsFresh(theirs.updatedAt, now)),
      angle:
        bothSharing && mine && theirs && heading !== null
          ? (bearingBetween(mine, theirs) - heading + 360) % 360
          : null,
      error,
      stepsError,
      steps,
      start,
      stop,
    }),
    [sharing, starting, bothSharing, mine, theirs, heading, error, stepsError, steps, now, start, stop],
  );
  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}

export function useCouplePresence(): PresenceValue {
  const value = useContext(PresenceContext);
  if (!value) throw new Error('useCouplePresence, CouplePresenceProvider içinde kullanılmalıdır.');
  return value;
}
