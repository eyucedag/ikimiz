import { act, renderHook } from '@testing-library/react-native';
import { useRequestGuard } from '@/src/hooks/useRequestGuard';
import { useLocalDate } from '@/src/hooks/useLocalDate';

test('newer requests invalidate older results and unmount invalidates all pending results', async () => {
  const view = await renderHook(useRequestGuard);
  const previous = view.result.current();
  const latest = view.result.current();
  expect(previous()).toBe(false);
  expect(latest()).toBe(true);
  await view.unmount();
  expect(latest()).toBe(false);
});

test('daily query keys change when midnight passes', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 10, 8, 23, 59, 45));
  const view = await renderHook(useLocalDate);
  expect(view.result.current).toBe('2026-11-08');
  await act(async () => {
    jest.advanceTimersByTime(30_000);
  });
  expect(view.result.current).toBe('2026-11-09');
  await view.unmount();
  jest.useRealTimers();
});
