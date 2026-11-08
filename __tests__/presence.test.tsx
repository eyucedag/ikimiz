import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { AppState, AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { CouplePresenceProvider, useCouplePresence } from '@/src/hooks/useCouplePresence';
import { presenceService } from '@/src/services/presenceService';

jest.mock('@/src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
jest.mock('@/src/hooks/useCouple', () => ({
  useCouple: () => ({ couple: { id: 'couple' }, partner: { id: 'partner' } }),
}));
jest.mock('@/src/lib/supabase', () => ({
  supabase: { removeChannel: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@/src/services/presenceService', () => ({
  presenceService: {
    locations: jest.fn(),
    steps: jest.fn(),
    updateLocation: jest.fn(),
    clearLocation: jest.fn(),
    saveSteps: jest.fn(),
    channel: jest.fn(),
  },
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  watchHeadingAsync: jest.fn(),
}));
jest.mock('expo-sensors', () => ({
  Pedometer: {
    isAvailableAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    watchStepCount: jest.fn(),
  },
}));

const listeners = new Set<(state: AppStateStatus) => void>();
let positionCallback: Parameters<typeof Location.watchPositionAsync>[1];
const removePosition = jest.fn();
const removeHeading = jest.fn();
const wrapper = ({ children }: { children: ReactNode }) => (
  <CouplePresenceProvider>{children}</CouplePresenceProvider>
);
const fix: Location.LocationObject = {
  timestamp: new Date(2026, 10, 8, 12).getTime(),
  coords: {
    latitude: 41,
    longitude: 29,
    heading: 0,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    speed: 0,
  },
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(fix.timestamp);
  jest.clearAllMocks();
  listeners.clear();
  Object.defineProperty(AppState, 'currentState', { value: 'active', configurable: true, writable: true });
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    const listener = callback as (state: AppStateStatus) => void;
    listeners.add(listener);
    return {
      remove: () => {
        listeners.delete(listener);
      },
    };
  });
  jest
    .mocked(Location.requestForegroundPermissionsAsync)
    .mockResolvedValue({ granted: true } as Location.LocationPermissionResponse);
  jest.mocked(Location.watchPositionAsync).mockImplementation(async (_options, callback) => {
    positionCallback = callback;
    return { remove: removePosition };
  });
  jest.mocked(Location.watchHeadingAsync).mockResolvedValue({ remove: removeHeading });
  jest.mocked(Pedometer.isAvailableAsync).mockResolvedValue(false);
  jest.mocked(presenceService.locations).mockResolvedValue([]);
  jest.mocked(presenceService.steps).mockResolvedValue([]);
  jest.mocked(presenceService.updateLocation).mockResolvedValue();
  jest.mocked(presenceService.clearLocation).mockResolvedValue();
});
afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test('location is requested only by the direction control and stop clears the shared fix', async () => {
  const view = await renderHook(useCouplePresence, { wrapper });
  expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  await act(async () => {
    await view.result.current.start();
  });
  await act(async () => positionCallback(fix));
  expect(view.result.current.sharing).toBe(true);
  expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
  await act(async () => {
    view.result.current.stop();
  });
  expect(view.result.current.sharing).toBe(false);
  expect(presenceService.clearLocation).toHaveBeenCalledWith('me', 'couple');
  expect(removePosition).toHaveBeenCalledTimes(1);
  expect(removeHeading).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('sharing survives the iOS inactive phase but closes on background and stays off after returning', async () => {
  const view = await renderHook(useCouplePresence, { wrapper });
  await act(async () => {
    await view.result.current.start();
  });
  await act(async () => positionCallback(fix));
  await act(async () => {
    listeners.forEach((listener) => listener('inactive'));
  });
  expect(view.result.current.sharing).toBe(true);
  await act(async () => {
    listeners.forEach((listener) => listener('background'));
  });
  expect(view.result.current.sharing).toBe(false);
  expect(presenceService.clearLocation).toHaveBeenCalledWith('me', 'couple');
  await act(async () => {
    listeners.forEach((listener) => listener('active'));
  });
  expect(view.result.current.sharing).toBe(false);
  expect(Location.watchPositionAsync).toHaveBeenCalledTimes(1);
  await view.unmount();
});

test('stationary devices keep publishing presence instead of silently expiring', async () => {
  const view = await renderHook(useCouplePresence, { wrapper });
  const start = view.result.current.start;
  await act(async () => {
    await start();
  });
  await act(async () => positionCallback(fix));
  const before = jest.mocked(presenceService.updateLocation).mock.calls.length;
  await act(async () => {
    jest.advanceTimersByTime(180_000);
  });
  expect(jest.mocked(presenceService.updateLocation).mock.calls.length).toBeGreaterThan(before);
  expect(view.result.current.sharing).toBe(true);
  await view.unmount();
});

test('a permission request resolving after background cannot create a leaked GPS subscription', async () => {
  let grant!: (value: Location.LocationPermissionResponse) => void;
  jest.mocked(Location.requestForegroundPermissionsAsync).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        grant = resolve;
      }),
  );
  const view = await renderHook(useCouplePresence, { wrapper });
  let pending!: Promise<void>;
  act(() => {
    pending = view.result.current.start();
  });
  await act(async () => {
    listeners.forEach((listener) => listener('background'));
  });
  await act(async () => {
    grant({ granted: true } as Location.LocationPermissionResponse);
    await pending;
  });
  expect(Location.watchPositionAsync).not.toHaveBeenCalled();
  expect(view.result.current.sharing).toBe(false);
  await view.unmount();
});
