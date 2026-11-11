import * as FileSystem from 'expo-file-system/legacy';
import { decodeBase64, readFileBytes } from '@/src/utils/files';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(FileSystem.deleteAsync).mockResolvedValue();
});

test.each<[string, number[]]>([
  ['Zg==', [102]],
  ['Zm8=', [102, 111]],
  ['Zm9v', [102, 111, 111]],
  ['AP+A/w==', [0, 255, 128, 255]],
])('binary decoding preserves every byte: %s', (encoded, expected) => {
  expect(Array.from(new Uint8Array(decodeBase64(encoded)))).toEqual(expected);
});

test('large binary files do not overflow the regular expression stack', () => {
  const result = new Uint8Array(decodeBase64('////'.repeat(262144)));
  expect(result.length).toBe(786432);
  expect(result.every((byte) => byte === 255)).toBe(true);
});

test.each(['', 'bad', '====', 'Zm=v', 'Zg=!'])('rejects empty or corrupt data: %s', (value) => {
  expect(() => decodeBase64(value)).toThrow();
});

test('Android content URIs are copied and decoded natively, then the temporary file is cleaned', async () => {
  jest.mocked(FileSystem.copyAsync).mockResolvedValue();
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue('AP+A/w==');
  const bytes = await readFileBytes('content://photos/123');
  const local = jest.mocked(FileSystem.copyAsync).mock.calls[0][0].to;
  expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(local, { encoding: 'base64' });
  expect(Array.from(new Uint8Array(bytes))).toEqual([0, 255, 128, 255]);
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith(local, { idempotent: true });
});

test('cleans up copied files even when the provider fails to read them', async () => {
  jest.mocked(FileSystem.copyAsync).mockResolvedValue();
  jest.mocked(FileSystem.readAsStringAsync).mockRejectedValue(new Error('denied'));
  await expect(readFileBytes('content://photos/123')).rejects.toThrow('telefondan okunamadı');
  expect(FileSystem.deleteAsync).toHaveBeenCalled();
});

test('iOS file URIs do not go through fetch or unnecessary copies', async () => {
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue('Zg==');
  expect(new Uint8Array(await readFileBytes('file:///photo.jpg'))[0]).toBe(102);
  expect(FileSystem.copyAsync).not.toHaveBeenCalled();
});
