export function normalizeHttpUrl(value: string): string {
  const raw = value.trim();
  if (!raw || /\s/.test(raw)) throw new Error('Geçerli bir bağlantı girin.');
  try {
    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(raw);
    const url = new URL(hasScheme ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password)
      throw new Error();
    return url.toString();
  } catch {
    throw new Error('Geçerli bir http:// veya https:// bağlantısı girin.');
  }
}
