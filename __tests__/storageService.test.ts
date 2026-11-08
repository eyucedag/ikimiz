import { signStoragePaths } from '@/src/services/storageService';
import { supabase } from '@/src/lib/supabase';

jest.mock('@/src/lib/supabase', () => ({ supabase: { storage: { from: jest.fn() } } }));

test('signs hundreds of photos in one request and deduplicates paths', async () => {
  const paths = Array.from({ length: 500 }, (_, i) => `couple/photo-${i}`);
  const sign = jest.fn().mockResolvedValue({
    data: paths.map((path) => ({ path, signedUrl: `https://example.com/${path}`, error: null })),
    error: null,
  });
  jest
    .mocked(supabase.storage.from)
    .mockReturnValue({ createSignedUrls: sign } as unknown as ReturnType<typeof supabase.storage.from>);
  const urls = await signStoragePaths('couple-gallery', [...paths, paths[0]]);
  expect(sign).toHaveBeenCalledTimes(1);
  expect(sign).toHaveBeenCalledWith(paths, 86400);
  expect(urls.size).toBe(500);
});

test('empty galleries do not make a storage request', async () => {
  jest.mocked(supabase.storage.from).mockClear();
  expect((await signStoragePaths('couple-gallery', [])).size).toBe(0);
  expect(supabase.storage.from).not.toHaveBeenCalled();
});

test('an incomplete response is reported instead of corrupting the snapshot', async () => {
  const sign = jest.fn().mockResolvedValue({ data: [], error: null });
  jest
    .mocked(supabase.storage.from)
    .mockReturnValue({ createSignedUrls: sign } as unknown as ReturnType<typeof supabase.storage.from>);
  await expect(signStoragePaths('couple-gallery', ['missing'])).rejects.toThrow('eksik');
});
