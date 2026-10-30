import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateScheduleWindow } from '../lib/vapi-contact-tracker';

const TZ = 'America/New_York'; // UTC-4 in summer (EDT)

function makeUTCDate(isoString: string): Date {
  return new Date(isoString);
}

describe('calculateScheduleWindow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns null (dispatch immediately) when in the calling window (between 10am and 4pm local)', () => {
    // 2pm EDT = 18:00 UTC
    vi.setSystemTime(makeUTCDate('2026-01-15T18:00:00Z'));
    expect(calculateScheduleWindow(TZ)).toBeNull();
  });

  it('returns null at 10am exactly', () => {
    // 10am EDT = 14:00 UTC
    vi.setSystemTime(makeUTCDate('2026-01-15T14:00:00Z'));
    expect(calculateScheduleWindow(TZ)).toBeNull();
  });

  it('returns null at 3:59pm', () => {
    // 3:59pm EDT = 19:59 UTC
    vi.setSystemTime(makeUTCDate('2026-01-15T19:59:00Z'));
    expect(calculateScheduleWindow(TZ)).toBeNull();
  });

  it('schedules for tomorrow when past 4pm local', () => {
    // 5:25pm EDT = 21:25 UTC
    vi.setSystemTime(makeUTCDate('2026-01-15T21:25:00Z'));
    const window = calculateScheduleWindow(TZ);
    expect(window).not.toBeNull();

    const earliest = new Date(window!.earliestAt);
    const latest = new Date(window!.latestAt);

    // earliestAt must be before latestAt (window is valid)
    expect(earliest.getTime()).toBeLessThan(latest.getTime());

    // Both should be tomorrow (Jan 16)
    // earliestAt should be around 14:00 UTC (10am EST, UTC-5 in Jan)
    expect(earliest.getUTCDate()).toBe(16);
    expect(latest.getUTCDate()).toBe(16);
  });

  it('schedules for today when before 10am local', () => {
    // 8am EDT = 12:00 UTC (January = EST = UTC-5, so 8am EST = 13:00 UTC)
    vi.setSystemTime(makeUTCDate('2026-01-15T13:00:00Z'));
    const window = calculateScheduleWindow(TZ);
    expect(window).not.toBeNull();

    const earliest = new Date(window!.earliestAt);
    const latest = new Date(window!.latestAt);

    // Window must be valid (earliest before latest)
    expect(earliest.getTime()).toBeLessThan(latest.getTime());

    // Both should be today (Jan 15)
    expect(earliest.getUTCDate()).toBe(15);
    expect(latest.getUTCDate()).toBe(15);
  });

  it('always returns a window where earliestAt < latestAt', () => {
    const cases = [
      '2026-06-10T08:00:00Z', // 4am EDT - before window
      '2026-06-10T14:00:00Z', // 10am EDT - start of window → null
      '2026-06-10T17:00:00Z', // 1pm EDT - in window → null
      '2026-06-10T20:01:00Z', // 4:01pm EDT - just after window
      '2026-06-10T23:00:00Z', // 7pm EDT - evening
    ];

    for (const iso of cases) {
      vi.setSystemTime(makeUTCDate(iso));
      const window = calculateScheduleWindow(TZ);
      if (window !== null) {
        const earliest = new Date(window.earliestAt).getTime();
        const latest = new Date(window.latestAt).getTime();
        expect(earliest, `${iso}: earliestAt should be < latestAt`).toBeLessThan(latest);
      }
    }
  });
});
