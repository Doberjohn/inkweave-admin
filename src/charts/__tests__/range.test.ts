import {describe, expect, it} from 'vitest';
import {DAILY_BUCKET_LIMIT, RANGE_OPTIONS, bucketFor, rangeStartDay} from '../range';

describe('RANGE_OPTIONS', () => {
  it('offers the R-9 presets in order', () => {
    expect(RANGE_OPTIONS).toEqual([
      {value: '7d', label: '7 days'},
      {value: '30d', label: '30 days'},
      {value: '90d', label: '90 days'},
      {value: 'all', label: 'All'},
    ]);
  });
});

describe('rangeStartDay', () => {
  it('counts the window back from its end day, both days included', () => {
    expect(rangeStartDay('7d', '2026-09-30', '2026-01-01')).toBe('2026-09-24');
    expect(rangeStartDay('30d', '2026-09-30', '2026-01-01')).toBe('2026-09-01');
    expect(rangeStartDay('90d', '2026-09-30', '2026-01-01')).toBe('2026-07-03');
  });

  it('crosses month and year boundaries', () => {
    expect(rangeStartDay('7d', '2026-01-03', '2025-01-01')).toBe('2025-12-28');
    expect(rangeStartDay('30d', '2024-03-15', '2023-01-01')).toBe('2024-02-15');
  });

  it('never starts before the first day of data, and All starts there', () => {
    expect(rangeStartDay('30d', '2026-09-30', '2026-09-20')).toBe('2026-09-20');
    expect(rangeStartDay('all', '2026-09-30', '2026-03-02')).toBe('2026-03-02');
  });

  it('gives the one day of a one-day log', () => {
    expect(rangeStartDay('90d', '2026-09-30', '2026-09-30')).toBe('2026-09-30');
    expect(rangeStartDay('all', '2026-09-30', '2026-09-30')).toBe('2026-09-30');
  });

  it('falls back to the end day when the first day comes after it (no data yet)', () => {
    expect(rangeStartDay('all', '2026-09-30', '2026-10-05')).toBe('2026-09-30');
    expect(rangeStartDay('7d', '2026-09-30', '2026-10-05')).toBe('2026-09-30');
  });
});

describe('bucketFor', () => {
  it('charts up to 90 days per day and longer spans per week (R-9)', () => {
    expect(DAILY_BUCKET_LIMIT).toBe(90);
    expect(bucketFor('2026-09-30', '2026-09-30')).toBe('day');
    expect(bucketFor('2026-07-03', '2026-09-30')).toBe('day'); // 90 days
    expect(bucketFor('2026-07-02', '2026-09-30')).toBe('week'); // 91 days
    expect(bucketFor('2025-10-01', '2026-09-30')).toBe('week');
  });
});
