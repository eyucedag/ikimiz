import { createSerialQueue } from '@/src/utils/async';
import { bearingBetween, distanceMeters, locationIsFresh } from '@/src/utils/location';

test('stationary partners have zero separation and bearings are consistent', () => {
  expect(distanceMeters({ latitude: 41, longitude: 29 }, { latitude: 41, longitude: 29 })).toBe(0);
  expect(bearingBetween({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 })).toBeCloseTo(0);
  expect(bearingBetween({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(90);
  expect(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 })).toBeCloseTo(
    20_015_086,
    -2,
  );
});

test('invalid, expired and far-future locations cannot be considered current', () => {
  const now = Date.now();
  expect(locationIsFresh(new Date(now - 130_000).toISOString(), now)).toBe(false);
  expect(locationIsFresh('invalid', now)).toBe(false);
  expect(locationIsFresh(new Date(now + 60_000).toISOString(), now)).toBe(false);
  expect(locationIsFresh(new Date(now - 10_000).toISOString(), now)).toBe(true);
});

test('cleanup cannot overtake a location update; a failed write does not block later writes', async () => {
  const enqueue = createSerialQueue();
  const order: string[] = [];
  let finish!: () => void;
  const first = enqueue(async () => {
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
    order.push('update');
  });
  const failure = enqueue(async () => {
    throw new Error('network');
  });
  const failed = expect(failure).rejects.toThrow('network');
  const cleanup = enqueue(async () => {
    order.push('clear');
  });
  await Promise.resolve();
  expect(order).toEqual([]);
  finish();
  await Promise.all([first, failed, cleanup]);
  expect(order).toEqual(['update', 'clear']);
});
