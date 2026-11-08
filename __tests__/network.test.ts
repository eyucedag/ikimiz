import { fetchWithTimeout } from '@/src/utils/network';

const originalFetch = globalThis.fetch;
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  jest.useRealTimers();
});

test('offline requests are aborted at the configured timeout and clear their timer', async () => {
  globalThis.fetch = jest.fn(
    (_input, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
      }),
  ) as typeof fetch;
  const pending = fetchWithTimeout('https://example.com', {}, 1000);
  const check = expect(pending).rejects.toThrow('aborted');
  jest.advanceTimersByTime(1000);
  await check;
  expect(jest.getTimerCount()).toBe(0);
});

test('caller cancellation is preserved and successful requests clean up timers', async () => {
  const response = { ok: true } as Response;
  globalThis.fetch = jest.fn().mockResolvedValue(response);
  const controller = new AbortController();
  expect(await fetchWithTimeout('https://example.com', { signal: controller.signal })).toBe(response);
  expect(jest.getTimerCount()).toBe(0);
  controller.abort();
  globalThis.fetch = jest.fn((_input, options) => {
    expect(options?.signal?.aborted).toBe(true);
    return Promise.reject(new Error('cancelled'));
  }) as typeof fetch;
  await expect(fetchWithTimeout('https://example.com', { signal: controller.signal })).rejects.toThrow(
    'cancelled',
  );
});
