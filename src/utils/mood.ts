/** Kullanıcının cihazındaki takvim günü; UTC gece yarısı gün kaydırmaz. */
export function getLocalMoodDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getMoodHistoryStartDate(date: Date = new Date()): string {
  const start = new Date(date);
  start.setDate(start.getDate() - 29);
  return getLocalMoodDate(start);
}
