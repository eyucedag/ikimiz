jest.mock('@/src/lib/supabase', () => ({ supabase: { from: jest.fn() } }));

import { supabase } from '@/src/lib/supabase';
import { moodService } from '@/src/services/moodService';
import { getLocalMoodDate, getMoodHistoryStartDate } from '@/src/utils/mood';
import { MoodValue } from '@/src/types/mood';

const scope = { ownerId: 'me', partnerId: 'partner', coupleId: 'couple' };
const now = new Date(2026, 10, 4, 0, 15);
const row = {
  id: 'entry', owner_id: 'me', couple_id: 'couple', entry_date: '2026-11-04',
  mood: 'good', note: 'Güzel bir gün', created_at: '2026-11-04T00:00:00Z', updated_at: '2026-11-04T00:15:00Z',
};

function mockQuery(response: { data: unknown; error: unknown }) {
  const query = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), in: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(), lte: jest.fn().mockReturnThis(), order: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue(response), single: jest.fn().mockResolvedValue(response),
  };
  (supabase.from as jest.Mock).mockReturnValue(query);
  return query;
}

beforeEach(() => jest.clearAllMocks());

test('gün ve 30 günlük aralık yerel takvime göre hesaplanır; ay ve yıl sınırlarını aşar', () => {
  expect(getLocalMoodDate(now)).toBe('2026-11-04');
  expect(getMoodHistoryStartDate(now)).toBe('2026-10-06');
  expect(getMoodHistoryStartDate(new Date(2027, 0, 1, 0, 5))).toBe('2026-12-03');
  expect(getLocalMoodDate(new Date(2026, 10, 4, 23, 55))).toBe('2026-11-04');
});

test('geçersiz ruh hali, uzun not ve eksik eşleşme sunucuya gönderilmez', async () => {
  expect((await moodService.save({ ...scope, mood: 'unknown' as MoodValue, note: '' }, now)).error).toBeTruthy();
  expect((await moodService.save({ ...scope, mood: 'good', note: 'a'.repeat(281) }, now)).error).toContain('280');
  expect((await moodService.save({ ...scope, coupleId: '', mood: 'good', note: '' }, now)).error).toContain('eşleşin');
  expect((await moodService.save({ ...scope, partnerId: 'me', mood: 'good', note: '' }, now)).error).toContain('eşleşin');
  expect((await moodService.save({ ...scope, mood: 'good', note: '' }, new Date('invalid'))).error).toContain('tarihi');
  expect(supabase.from).not.toHaveBeenCalled();
});

test('günlük kayıt aynı sahip ve gün için upsert edilir; paylaşım zorunlu ve not kırpılır', async () => {
  const query = mockQuery({ data: row, error: null });
  const result = await moodService.save({ ...scope, mood: 'good', note: '  Güzel bir gün  ' }, now);
  expect(query.upsert).toHaveBeenCalledWith({
    owner_id: 'me', couple_id: 'couple', visibility: 'shared', is_deleted: false,
    entry_date: '2026-11-04', mood: 'good', note: 'Güzel bir gün',
  }, { onConflict: 'owner_id,entry_date' });
  expect(result.data).toEqual({
    id: 'entry', ownerId: 'me', coupleId: 'couple', date: '2026-11-04', mood: 'good',
    note: 'Güzel bir gün', createdAt: row.created_at, updatedAt: row.updated_at,
  });
});

test('geçmiş yalnızca mevcut çiftin iki üyesini ve son 30 günü sorgular', async () => {
  const query = mockQuery({ data: [row], error: null });
  expect(await moodService.list(scope, now)).toHaveLength(1);
  expect(query.eq.mock.calls).toEqual([['couple_id', 'couple'], ['visibility', 'shared'], ['is_deleted', false]]);
  expect(query.in).toHaveBeenCalledWith('owner_id', ['me', 'partner']);
  expect(query.gte).toHaveBeenCalledWith('entry_date', '2026-10-06');
  expect(query.lte).toHaveBeenCalledWith('entry_date', '2026-11-04');
  expect(query.limit).toHaveBeenCalledWith(60);
});

test('beklenmeyen başka çift veya kullanıcı kayıtları gösterilmez', async () => {
  mockQuery({ data: [row, { ...row, couple_id: 'old-couple' }, { ...row, owner_id: 'stranger' }], error: null });
  expect(await moodService.list(scope, now)).toHaveLength(1);
});

test('eksik sunucu şeması kaydetme başarısı olarak dönmez; yüklemede de açıklanır', async () => {
  mockQuery({ data: null, error: { code: 'PGRST205', message: 'table not in schema cache' } });
  const result = await moodService.save({ ...scope, mood: 'good', note: '' }, now);
  expect(result.data).toBeUndefined();
  expect(result.error).toContain('Veritabanı güncellemesi');
  await expect(moodService.list(scope, now)).rejects.toThrow('Veritabanı güncellemesi');
});

test('RLS reddi anlaşılır hata döndürür ve ham sunucu ayrıntısını göstermez', async () => {
  mockQuery({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } });
  const result = await moodService.save({ ...scope, mood: 'good', note: '' }, now);
  expect(result.data).toBeUndefined();
  expect(result.error).toContain('Eşleşmeniz doğrulanamadı');
  expect(result.error).not.toContain('row-level');
});

test('eksik veya başka kullanıcıya ait yanıt kaydedilmiş sayılmaz', async () => {
  mockQuery({ data: { ...row, owner_id: 'stranger' }, error: null });
  expect((await moodService.save({ ...scope, mood: 'good', note: '' }, now)).data).toBeUndefined();
  mockQuery({ data: null, error: null });
  expect((await moodService.save({ ...scope, mood: 'good', note: '' }, now)).data).toBeUndefined();
});

test('ağ hatası kaydetme kilidini tutacak bir istisna yerine hata sonucu döndürür', async () => {
  const query = mockQuery({ data: null, error: null });
  query.single.mockRejectedValueOnce(new TypeError('Network request failed'));
  const result = await moodService.save({ ...scope, mood: 'good', note: '' }, now);
  expect(result.data).toBeUndefined();
  expect(result.error).toContain('Bağlantınızı kontrol');
});
