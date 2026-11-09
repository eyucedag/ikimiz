import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { CoupleProvider, useCouple } from '@/src/hooks/useCouple';
import { coupleService } from '@/src/services/coupleService';
import { CoupleState } from '@/src/types';

jest.mock('@/src/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'me' } }) }));
jest.mock('@/src/services/coupleService', () => ({ coupleService: { getState: jest.fn() } }));
jest.mock('@/src/lib/supabase', () => ({
  supabase: {
    channel: () => {
      const channel = { on: () => channel, subscribe: () => channel };
      return channel;
    },
    removeChannel: jest.fn().mockResolvedValue(undefined),
  },
}));

const state: CoupleState = {
  couple: { id: 'couple', memberIds: ['me', 'partner'], createdAt: '2026-11-01' },
  partner: { id: 'partner', fullName: 'Partner', displayName: 'Partner', email: '', createdAt: '2026-11-01' },
  pendingInvitation: null,
};
const wrapper = ({ children }: { children: ReactNode }) => <CoupleProvider>{children}</CoupleProvider>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  jest.mocked(coupleService.getState).mockReset().mockResolvedValue(state);
});
afterEach(() => {
  jest.restoreAllMocks();
});

test('overlapping refresh requests share one request rather than racing screens', async () => {
  let resolve!: (value: CoupleState) => void;
  jest.mocked(coupleService.getState).mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const view = await renderHook(useCouple, { wrapper });
  let first!: Promise<CoupleState>;
  let second!: Promise<CoupleState>;
  await act(async () => {
    first = view.result.current.refresh();
    second = view.result.current.refresh();
  });
  expect(first).toBe(second);
  expect(coupleService.getState).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve(state);
    await first;
  });
  expect(view.result.current.couple?.id).toBe('couple');
  await view.unmount();
});

test('a temporary network error retains the valid partner instead of pretending to unpair', async () => {
  const view = await renderHook(useCouple, { wrapper });
  expect(view.result.current.partner?.id).toBe('partner');
  jest.mocked(coupleService.getState).mockRejectedValueOnce(new Error('network'));
  await act(async () => {
    await view.result.current.refresh();
  });
  expect(view.result.current.partner?.id).toBe('partner');
  expect(view.result.current.error).toBe('network');
  jest
    .mocked(coupleService.getState)
    .mockResolvedValueOnce({ couple: null, partner: null, pendingInvitation: null });
  await act(async () => {
    await view.result.current.refresh();
  });
  expect(view.result.current.isPaired).toBe(false);
  expect(view.result.current.error).toBeNull();
  await view.unmount();
});

test('foreground refresh keeps the existing signed couple photo URL stable', async () => {
  const withPhoto: CoupleState = {
    ...state,
    couple: { ...state.couple!, photoPath: 'couple/photo', photoUrl: 'https://storage/photo?token=first' },
  };
  jest.mocked(coupleService.getState).mockResolvedValue(withPhoto);
  const view = await renderHook(useCouple, { wrapper });
  expect(view.result.current.couple?.photoUrl).toBe('https://storage/photo?token=first');
  jest.mocked(coupleService.getState).mockResolvedValueOnce({
    ...withPhoto,
    couple: { ...withPhoto.couple!, photoUrl: 'https://storage/photo?token=second' },
  });
  await act(async () => {
    await view.result.current.refresh();
  });
  expect(view.result.current.couple?.photoUrl).toBe('https://storage/photo?token=first');
  await view.unmount();
});
