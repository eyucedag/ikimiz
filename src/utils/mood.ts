import { localDateKey } from './date';

export const getLocalMoodDate = localDateKey;

export function getMoodHistoryStartDate(date: Date = new Date()): string {
  const start = new Date(date);
  start.setDate(start.getDate() - 29);
  return getLocalMoodDate(start);
}
