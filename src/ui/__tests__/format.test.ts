import {afterEach, describe, expect, it, vi} from 'vitest';
import {fmtDay, fmtGap, fmtInt, fmtScore, fmtWeekday, sharePercent} from '../format';

const MINUS = '−';

// The zone this run started in. Deleting TZ doesn't reset Node's zone cache, so
// the time-zone cleanup names this zone again before Vitest drops the stub.
const HOST_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

describe('fmtInt', () => {
  it('groups thousands', () => {
    expect(fmtInt(0)).toBe('0');
    expect(fmtInt(7)).toBe('7');
    expect(fmtInt(2054)).toBe('2,054');
    expect(fmtInt(1234567)).toBe('1,234,567');
  });

  it('rounds to a whole number', () => {
    expect(fmtInt(2.6)).toBe('3');
    expect(fmtInt(2.4)).toBe('2');
  });

  it('writes a negative with the true minus sign, and never a negative zero', () => {
    expect(fmtInt(-1200)).toBe(`${MINUS}1,200`);
    expect(fmtInt(-0.4)).toBe('0');
    expect(fmtInt(-0)).toBe('0');
  });

  it('shows a dash for a value that is not a number', () => {
    expect(fmtInt(NaN)).toBe('—');
    expect(fmtInt(Infinity)).toBe('—');
  });
});

describe('fmtGap', () => {
  it('signs a gap both ways, to two places', () => {
    expect(fmtGap(-0.3)).toBe(`${MINUS}0.30`);
    expect(fmtGap(0.83)).toBe('+0.83');
    expect(fmtGap(1.234)).toBe('+1.23');
    expect(fmtGap(-2.5)).toBe(`${MINUS}2.50`);
  });

  it('uses U+2212, never a hyphen', () => {
    expect(fmtGap(-0.3).codePointAt(0)).toBe(0x2212);
    expect(fmtGap(-0.3)).not.toContain('-');
  });

  it('leaves zero, and anything that rounds to it, unsigned', () => {
    expect(fmtGap(0)).toBe('0.00');
    expect(fmtGap(-0)).toBe('0.00');
    expect(fmtGap(-0.004)).toBe('0.00');
    expect(fmtGap(0.004)).toBe('0.00');
  });

  it('shows a dash when there is no gap', () => {
    expect(fmtGap(null)).toBe('—');
    expect(fmtGap(NaN)).toBe('—');
  });
});

describe('fmtScore', () => {
  it('defaults to one decimal place', () => {
    expect(fmtScore(6.44)).toBe('6.4');
    expect(fmtScore(6.46)).toBe('6.5');
    expect(fmtScore(7)).toBe('7.0');
  });

  it('takes the number of places', () => {
    expect(fmtScore(7, 0)).toBe('7');
    expect(fmtScore(6.456, 2)).toBe('6.46');
  });

  it('writes a negative with the true minus sign, and never a negative zero', () => {
    expect(fmtScore(-1.24)).toBe(`${MINUS}1.2`);
    expect(fmtScore(-0.04)).toBe('0.0');
  });

  it('shows a dash for an unscored value', () => {
    expect(fmtScore(null)).toBe('—');
    expect(fmtScore(NaN)).toBe('—');
  });
});

// Moved with sharePercent from calibration's chartData.test.ts (R3-1a). A part
// with any share never reads 0%, and one short of the whole never 100% (R-43).
describe('sharePercent', () => {
  it.each([
    [1 / 3, '33%'],
    [1 / 2, '50%'],
    [1 / 6, '17%'],
    [0, '0%'],
    [1 / 400, '<1%'],
    [0.0049, '<1%'],
    [0.005, '1%'],
    [0.994, '99%'],
    [0.995, '>99%'],
    [1, '100%'],
  ])('prints %s as %s', (fraction, text) => {
    expect(sharePercent(fraction)).toBe(text);
  });
});

describe('fmtDay and fmtWeekday', () => {
  it('label a day by month and date, with no leading zero', () => {
    expect(fmtDay('2026-09-30')).toBe('Sep 30');
    expect(fmtDay('2026-01-01')).toBe('Jan 1');
    expect(fmtDay('2026-12-31')).toBe('Dec 31');
    expect(fmtDay('2024-02-29')).toBe('Feb 29');
  });

  it('put the weekday first', () => {
    expect(fmtWeekday('2026-09-30')).toBe('Wed Sep 30');
    expect(fmtWeekday('2026-01-01')).toBe('Thu Jan 1');
    expect(fmtWeekday('2026-10-03')).toBe('Sat Oct 3');
    expect(fmtWeekday('2026-10-04')).toBe('Sun Oct 4');
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-9-30', '2026-09-30T12:00:00Z', 'not a day', ''])(
    'return %j unchanged, as it is not a YYYY-MM-DD day',
    (input) => {
      expect(fmtDay(input)).toBe(input);
      expect(fmtWeekday(input)).toBe(input);
    },
  );

  describe('in any time zone', () => {
    afterEach(() => {
      vi.stubEnv('TZ', HOST_ZONE);
      vi.unstubAllEnvs();
    });

    // UTC+14 and UTC−11, neither with daylight time: mixing local and UTC date
    // getters moves the day by one in one of them. The app project's vmForks
    // workers are processes, so a TZ change takes effect; afterEach restores the
    // host zone, because the worker runs other files next.
    it.each(['Pacific/Kiritimati', 'Pacific/Pago_Pago'])('label the same day in %s', (zone) => {
      vi.stubEnv('TZ', zone);
      expect(fmtDay('2026-09-30')).toBe('Sep 30');
      expect(fmtWeekday('2026-09-30')).toBe('Wed Sep 30');
      expect(fmtWeekday('2026-01-01')).toBe('Thu Jan 1');
    });
  });
});
