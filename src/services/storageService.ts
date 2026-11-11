import { supabase } from '@/src/lib/supabase';

/** Sign a whole gallery in one request rather than one HTTP call per file. */
export async function signStoragePaths(
  bucket: string,
  paths: string[],
  expiresIn = 86_400,
): Promise<Map<string, string>> {
  const unique = [...new Set(paths)];
  if (!unique.length) return new Map();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(unique, expiresIn);
  if (error || !data) throw new Error('Dosyaların görüntüleme bağlantıları oluşturulamadı. Yeniden deneyin.');
  const urls = new Map<string, string>();
  for (const row of data) {
    if (row.error || !row.path || !row.signedUrl)
      throw new Error('Bir dosyanın bağlantısı oluşturulamadı. Listeyi yenileyin.');
    urls.set(row.path, row.signedUrl);
  }
  if (urls.size !== unique.length) throw new Error('Bazı dosyaların bağlantıları eksik. Listeyi yenileyin.');
  return urls;
}
