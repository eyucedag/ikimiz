import * as FileSystem from 'expo-file-system/legacy';
import { fetchWithTimeout } from './network';

/** Decode binary files without depending on browser-only atob/Blob APIs. */
export function decodeBase64(value: string): ArrayBuffer {
  const clean = value.replace(/\s/g, '');
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const dataLength = clean.length - padding;
  if (
    !clean ||
    clean.length % 4 !== 0 ||
    /[^A-Za-z0-9+/]/.test(clean.slice(0, dataLength)) ||
    dataLength % 4 === 1
  ) {
    throw new Error('Dosya içeriği okunamadı.');
  }
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new Uint8Array((clean.length / 4) * 3 - padding);
  let offset = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = alphabet.indexOf(clean[i]);
    const b = alphabet.indexOf(clean[i + 1]);
    const c = alphabet.indexOf(clean[i + 2]);
    const d = alphabet.indexOf(clean[i + 3]);
    bytes[offset++] = (a << 2) | (b >> 4);
    if (c >= 0) bytes[offset++] = ((b & 15) << 4) | (c >> 2);
    if (d >= 0) bytes[offset++] = ((c & 3) << 6) | d;
  }
  return bytes.buffer;
}

/** Android content URIs and iOS file URIs must be read through the native file API. */
export async function readFileBytes(uri: string): Promise<ArrayBuffer> {
  if (/^https?:\/\//i.test(uri)) {
    const response = await fetchWithTimeout(uri);
    if (!response.ok) throw new Error('Dosya indirilemedi. Bağlantınızı kontrol edin.');
    const content = await response.arrayBuffer();
    if (!content.byteLength) throw new Error('Seçilen dosya boş.');
    return content;
  }
  let localUri = uri;
  let temporaryUri: string | null = null;
  try {
    // Some Android providers permit copying but not direct binary reads.
    if (uri.startsWith('content://') && FileSystem.cacheDirectory) {
      temporaryUri = `${FileSystem.cacheDirectory}ikimiz-upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await FileSystem.copyAsync({ from: uri, to: temporaryUri });
      localUri = temporaryUri;
    }
    return decodeBase64(
      await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 }),
    );
  } catch {
    throw new Error('Seçilen dosya telefondan okunamadı. Dosyayı yeniden seçin.');
  } finally {
    if (temporaryUri) await FileSystem.deleteAsync(temporaryUri, { idempotent: true }).catch(() => undefined);
  }
}
