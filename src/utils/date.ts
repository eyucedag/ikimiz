const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "az önce", "5 dk önce", "dün 14:20" gibi Türkçe göreli zaman. */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diffSec = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (diffSec < 60) return 'az önce';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (diffHour < 24 && d.getDate() === now.getDate()) return `bugün ${time}`;
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
