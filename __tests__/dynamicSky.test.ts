import { getSkyPhase } from '@/src/components/DynamicSky';

describe('Aurora Forest sky time bands', () => {
  const localTime = (hour: number, minute = 0) => new Date(2026, 5, 21, hour, minute);

  it('uses sunrise from 06:00 until 10:00', () => {
    expect(getSkyPhase(localTime(6))).toBe('morning');
    expect(getSkyPhase(localTime(9, 59))).toBe('morning');
    expect(getSkyPhase(localTime(10))).toBe('day');
  });

  it('uses daytime from 10:00 until 17:00', () => {
    expect(getSkyPhase(localTime(10))).toBe('day');
    expect(getSkyPhase(localTime(16, 59))).toBe('day');
    expect(getSkyPhase(localTime(17))).toBe('sunset');
  });

  it('uses sunset from 17:00 until 19:00 and twilight until 22:00', () => {
    expect(getSkyPhase(localTime(17))).toBe('sunset');
    expect(getSkyPhase(localTime(18, 59))).toBe('sunset');
    expect(getSkyPhase(localTime(19))).toBe('evening');
    expect(getSkyPhase(localTime(21, 59))).toBe('evening');
  });

  it('uses night from 22:00 through 05:59', () => {
    expect(getSkyPhase(localTime(22))).toBe('night');
    expect(getSkyPhase(localTime(23, 59))).toBe('night');
    expect(getSkyPhase(localTime(0))).toBe('night');
    expect(getSkyPhase(localTime(5, 59))).toBe('night');
  });
});
