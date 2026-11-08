import { normalizeHttpUrl } from '@/src/utils/url';

test('accepts normal links and adds HTTPS to a hostname', () => {
  expect(normalizeHttpUrl('example.com/gift')).toBe('https://example.com/gift');
  expect(normalizeHttpUrl(' https://example.com/song?a=1 ')).toBe('https://example.com/song?a=1');
});
test.each(['', 'not a url', 'javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com'])(
  'rejects invalid links: %s',
  (url) => {
    expect(() => normalizeHttpUrl(url)).toThrow();
  },
);
