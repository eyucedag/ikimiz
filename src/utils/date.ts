const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Date-only database values are calendar days, never UTC instants. */
export function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return new Date(NaN);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return localDateKey(date) === value ? date : new Date(NaN);
}

export function calendarDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseLocalDate(value) : new Date(value);
}

/** Celebrate February 29 on February 28 in years without a leap day. */
export function anniversaryInYear(original: Date, year: number): Date {
  const lastDay = new Date(year, original.getMonth() + 1, 0).getDate();
  return new Date(year, original.getMonth(), Math.min(original.getDate(), lastDay));
}

export function formatDateTime(iso: string): string {
  const d = calendarDate(iso);
  if (!Number.isFinite(d.getTime())) return 'Tarih belirtilmemiş';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = calendarDate(iso);
  if (!Number.isFinite(d.getTime())) return 'Tarih belirtilmemiş';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "az önce", "5 dk önce", "dün 14:20" gibi Türkçe göreli zaman. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return 'Tarih belirtilmemiş';
  const diffSec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (diffSec < 60) return 'az önce';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diffHour < 24 && d.toDateString() === now.toDateString()) return `bugün ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `dün ${time}`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} gün önce`;
  return formatDate(iso);
}

/** Türkçe karşılama: Günaydın / İyi günler / İyi akşamlar / İyi geceler */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Günaydın';
  if (h >= 12 && h < 18) return 'İyi günler';
  if (h >= 18 && h < 23) return 'İyi akşamlar';
  return 'İyi geceler';
}

export function todayLabel(date: Date = new Date()): string {
  const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${days[date.getDay()]}`;
}
