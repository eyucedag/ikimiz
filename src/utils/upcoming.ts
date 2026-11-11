import { UpcomingItem } from '@/src/types';
import { anniversaryInYear, localDateKey, parseLocalDate } from './date';

export interface UpcomingEventRow {
  id: string;
  title: string;
  starts_at: string;
  all_day: boolean;
  location: string | null;
}
export interface UpcomingSpecialRow {
  id: string;
  title: string;
  date: string;
  kind: string;
}

export function upcomingWindow(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

export function buildUpcomingItems(
  events: UpcomingEventRow[],
  specials: UpcomingSpecialRow[],
  now = new Date(),
): UpcomingItem[] {
  const { start, end } = upcomingWindow(now);
  const items: (UpcomingItem & { sortAt: number })[] = [];
  for (const event of events) {
    const date = new Date(event.starts_at);
    if (!Number.isFinite(date.getTime()) || date > end || date < (event.all_day ? start : now)) continue;
    const time = event.all_day
      ? 'Tüm gün'
      : date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    items.push({
      id: event.id,
      title: event.title,
      date: localDateKey(date),
      kind: 'event',
      sortAt: date.getTime(),
      subtitle: [
        date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        time,
        event.location?.trim(),
      ]
        .filter(Boolean)
        .join(' · '),
    });
  }
  for (const special of specials) {
    const original = parseLocalDate(special.date);
    if (!Number.isFinite(original.getTime())) continue;
    const repeating = special.kind === 'anniversary' || special.kind === 'birthday';
    let date = original;
    if (repeating && original < start) {
      date = anniversaryInYear(original, now.getFullYear());
      if (date < start) date = anniversaryInYear(original, now.getFullYear() + 1);
    }
    if (date < start || date > end) continue;
    const kindLabel =
      special.kind === 'birthday' ? 'Doğum günü' : special.kind === 'anniversary' ? 'Yıl dönümü' : 'Özel gün';
    items.push({
      id: special.id,
      title: special.title,
      date: localDateKey(date),
      kind: 'special',
      sortAt: date.getTime(),
      subtitle: `${date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} · ${kindLabel}`,
    });
  }
  return items
    .sort((a, b) => a.sortAt - b.sortAt || a.title.localeCompare(b.title, 'tr'))
    .slice(0, 10)
    .map(({ sortAt: _sortAt, ...item }) => item);
}
