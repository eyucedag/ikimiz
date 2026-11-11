import { anniversaryInYear, formatDate, localDateKey, parseLocalDate } from '@/src/utils/date';
import { buildUpcomingItems, UpcomingEventRow, UpcomingSpecialRow } from '@/src/utils/upcoming';

const now = new Date(2026, 10, 8, 15, 0);
const event = (id: string, date: Date, allDay = false): UpcomingEventRow => ({
  id,
  title: id,
  starts_at: date.toISOString(),
  all_day: allDay,
  location: null,
});
const special = (id: string, date: string, kind = 'other'): UpcomingSpecialRow => ({
  id,
  title: id,
  date,
  kind,
});

test('date-only values stay on their local day in every device time zone', () => {
  expect(localDateKey(parseLocalDate('2026-11-08'))).toBe('2026-11-08');
  expect(formatDate('2026-11-08')).toBe('8 Kasım 2026');
  expect(Number.isNaN(parseLocalDate('2026-02-30').getTime())).toBe(true);
});

test('upcoming events are in chronological order and only cover the next week', () => {
  const result = buildUpcomingItems(
    [
      event('later', new Date(2026, 10, 12, 16)),
      event('tomorrow', new Date(2026, 10, 9, 8)),
      event('past', new Date(2026, 10, 8, 14)),
      event('next-month', new Date(2026, 11, 1)),
      event('too-late', new Date(2026, 10, 15, 16)),
    ],
    [],
    now,
  );
  expect(result.map((item) => item.id)).toEqual(['tomorrow', 'later']);
});

test('all-day events remain visible today; UTC timestamps navigate to the local day', () => {
  const date = new Date(2026, 10, 9, 0, 30);
  const result = buildUpcomingItems(
    [event('all-day', new Date(2026, 10, 8), true), event('after-midnight', date)],
    [],
    now,
  );
  expect(result.map((item) => item.date)).toEqual(['2026-11-08', '2026-11-09']);
});

test('only birthdays/anniversaries repeat; old one-time dates are not resurrected', () => {
  const result = buildUpcomingItems(
    [],
    [
      special('birthday', '1998-11-09', 'birthday'),
      special('old-other', '2025-11-09'),
      special('future-other', '2027-11-09'),
      special('this-year', '2026-11-10'),
      special('far', '2026-12-01'),
    ],
    now,
  );
  expect(result.map((item) => item.id)).toEqual(['birthday', 'this-year']);
});

test('annual dates cross the year boundary and handle leap days consistently', () => {
  expect(
    buildUpcomingItems([], [special('birthday', '2000-01-02', 'birthday')], new Date(2026, 11, 30))[0].date,
  ).toBe('2027-01-02');
  expect(localDateKey(anniversaryInYear(new Date(2000, 1, 29), 2027))).toBe('2027-02-28');
  expect(localDateKey(anniversaryInYear(new Date(2000, 1, 29), 2028))).toBe('2028-02-29');
});
