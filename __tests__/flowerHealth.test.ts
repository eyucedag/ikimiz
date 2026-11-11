import { CoupleFlowerState, flowerHealthNow } from '@/src/services/coupleFlowerService';

jest.mock('@/src/lib/supabase', () => ({ supabase: {} }));
const updatedAt = new Date(2026, 10, 8).toISOString();
const state = (plantType: CoupleFlowerState['plantType']): CoupleFlowerState => ({
  plantType,
  health: 80,
  updatedAt,
  lastWateredAt: null,
});

test.each<[CoupleFlowerState['plantType'], number]>([
  ['cactus', 75],
  ['violet', 50],
  ['hanging', 35],
])('%s decays at its species rate after five days', (type, expected) => {
  expect(flowerHealthNow(state(type), new Date(updatedAt).getTime() + 5 * 86_400_000)).toBe(expected);
});
test('health never becomes negative, NaN or grows due to a device clock before updatedAt', () => {
  expect(flowerHealthNow(state('hanging'), new Date(updatedAt).getTime() + 100 * 86_400_000)).toBe(0);
  expect(flowerHealthNow(state('cactus'), 0)).toBe(80);
  expect(flowerHealthNow({ ...state('violet'), updatedAt: 'invalid' })).toBe(80);
});
