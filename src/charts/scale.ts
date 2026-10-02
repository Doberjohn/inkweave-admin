/**
 * Scale, layout and calendar math for the chart kit (docs/plans/R-redesign.md,
 * "Chart kit (R1-3b)"). Pure functions, with no React and no DOM.
 *
 * Days are 'YYYY-MM-DD' strings read as UTC calendar days, as src/ui/format.ts
 * reads them. Every step is a whole UTC day of 86,400,000 ms, so no result
 * moves with the viewer's time zone or a daylight-saving change.
 */

/**
 * A UTC calendar day, 'YYYY-MM-DD'. Only a name for the string: a function
 * that takes one says what it does with a string that isn't a day.
 */
export type Day = string;

const DAY_MS = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The mantissas a clean axis top may use. From 10 up, half of each one is a
 * whole number too, so a 0 / middle / top axis reads cleanly.
 */
const NICE_STEPS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Drops float noise: 3 * 0.1 is 0.30000000000000004. */
function clean(n: number): number {
  return Number(n.toPrecision(12));
}

/** A clean axis top at or above `max`: 37 -> 40, 402 -> 500, 11 -> 12. Zero, a negative or a non-number gives 1. */
export function niceCeiling(max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  for (const step of NICE_STEPS) {
    const top = clean(step * magnitude);
    if (top >= max) return top;
  }
  return clean(10 * magnitude);
}

/** `count` evenly spaced ticks from 0 to `ceiling`, both ends included: (40) -> [0, 20, 40]. A count below 2 counts as 2. */
export function axisTicks(ceiling: number, count = 3): number[] {
  if (!Number.isFinite(ceiling) || ceiling <= 0) return [0];
  const steps = Math.max(Math.floor(count), 2) - 1;
  return Array.from({length: steps + 1}, (_, i) => clean((ceiling * i) / steps));
}

/** A linear map from `domain` onto `range`, extrapolating past the ends. A zero-width domain maps every value to the middle of the range. */
export function linear(domain: [number, number], range: [number, number]): (v: number) => number {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d1 === d0) return () => (r0 + r1) / 2;
  const k = (r1 - r0) / (d1 - d0);
  return (v) => r0 + (v - d0) * k;
}

/** The index of the value in `xs` nearest to `x`, the earlier one on a tie. -1 for an empty list. `xs` needn't be sorted. */
export function nearestIndex(xs: readonly number[], x: number): number {
  let best = -1;
  let bestDistance = Infinity;
  xs.forEach((value, i) => {
    const distance = Math.abs(value - x);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

function dayOf(time: number): Day {
  return new Date(time).toISOString().slice(0, 10);
}

/** The UTC midnight of a 'YYYY-MM-DD' day in ms, or null when it is not a real calendar day. */
function dayTime(day: Day): number | null {
  if (!DAY_RE.test(day)) return null;
  const time = Date.parse(`${day}T00:00:00Z`);
  // Date.parse rolls 2026-02-30 over into March; the round trip rejects it.
  return Number.isNaN(time) || dayOf(time) !== day ? null : time;
}

/** Whether `day` is a real 'YYYY-MM-DD' calendar day. */
export function isDay(day: string): boolean {
  return dayTime(day) != null;
}

/** Whole UTC days since 1970-01-01, so a chart can place dates by time. Null when `day` isn't a day. */
export function dayIndex(day: Day): number | null {
  const time = dayTime(day);
  return time == null ? null : Math.round(time / DAY_MS);
}

/** `day` moved by `n` whole days: ('2026-09-30', 1) -> '2026-10-01'. Anything that isn't a day comes back unchanged. */
export function addDays(day: Day, n: number): Day {
  const time = dayTime(day);
  return time == null ? day : dayOf(time + Math.round(n) * DAY_MS);
}

/** How many days run from `start` to `end`, both included: one day -> 1. 0 when end is before start or either isn't a day. */
export function daySpan(start: Day, end: Day): number {
  const a = dayTime(start);
  const b = dayTime(end);
  if (a == null || b == null) return 0;
  return b < a ? 0 : Math.round((b - a) / DAY_MS) + 1;
}

/** Every day from `start` to `end`, both included. Empty when end is before start or either isn't a day. */
export function eachDay(start: Day, end: Day): Day[] {
  const a = dayTime(start);
  if (a == null) return [];
  return Array.from({length: daySpan(start, end)}, (_, i) => dayOf(a + i * DAY_MS));
}

/** The UTC Monday of the week `day` falls in: the day itself on a Monday. Anything that isn't a day comes back unchanged. */
export function weekStart(day: Day): Day {
  const time = dayTime(day);
  if (time == null) return day;
  const sinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return dayOf(time - sinceMonday * DAY_MS);
}

/**
 * An estimate of `text`'s rendered width at `fontSize` px, for laying out chart
 * labels without measuring the DOM (jsdom has no layout). It errs wide, at
 * 0.6em a character, so a label it says fits does fit.
 */
export function textWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.6;
}
