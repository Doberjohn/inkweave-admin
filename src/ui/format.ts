/**
 * Number, share and date text shared by every admin page. Negative numbers
 * carry the true minus sign (U+2212) and a missing value reads as an em dash.
 * Days are 'YYYY-MM-DD' strings read as UTC calendar days, so a label never
 * shifts with the viewer's time zone.
 */

const MINUS = '−';
const NO_VALUE = '—';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** |n| to `digits` places, plus the sign it shows: a value that rounds to zero shows none. */
function fixed(n: number, digits: number): {text: string; sign: number} {
  const text = Math.abs(n).toFixed(digits);
  return {text, sign: Number(text) === 0 ? 0 : Math.sign(n)};
}

/** 2054 -> "2,054", rounded to a whole number; -1200 -> "−1,200". */
export function fmtInt(n: number): string {
  if (!Number.isFinite(n)) return NO_VALUE;
  const {text, sign} = fixed(n, 0);
  const grouped = Number(text).toLocaleString('en-US');
  return sign < 0 ? MINUS + grouped : grouped;
}

/** A calibration gap, signed both ways: -0.3 -> "−0.30", 0.83 -> "+0.83", 0 -> "0.00", null -> "—". */
export function fmtGap(gap: number | null): string {
  if (gap == null || !Number.isFinite(gap)) return NO_VALUE;
  const {text, sign} = fixed(gap, 2);
  if (sign === 0) return text;
  return (sign < 0 ? MINUS : '+') + text;
}

/** A score or an average of scores: 6.46 -> "6.5", (7, 0) -> "7", null -> "—". */
export function fmtScore(n: number | null, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return NO_VALUE;
  const {text, sign} = fixed(n, digits);
  return sign < 0 ? MINUS + text : text;
}

/** A 'YYYY-MM-DD' string as a UTC midnight, or null when it is not a real calendar day. */
function parseDay(day: string): Date | null {
  const match = DAY_RE.exec(day);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  // Date.UTC rolls "2026-02-30" over into March (and maps years below 100 to 19xx); the round trip rejects both.
  return date.toISOString().slice(0, 10) === day ? date : null;
}

/** "2026-09-30" -> "Sep 30". Anything that isn't a 'YYYY-MM-DD' day comes back unchanged. */
export function fmtDay(day: string): string {
  const date = parseDay(day);
  return date ? `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}` : day;
}

/** "2026-09-30" -> "Wed Sep 30". Anything that isn't a 'YYYY-MM-DD' day comes back unchanged. */
export function fmtWeekday(day: string): string {
  const date = parseDay(day);
  return date ? `${WEEKDAYS[date.getUTCDay()]} ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}` : day;
}

/**
 * A share, from 0 to 1, as a whole percentage: 1 / 3 -> "33%". Each part
 * rounds on its own (R-43). A share above zero that would round to 0 prints
 * "<1%", so a part with any never reads "0%"; one below 1 that would round to
 * 100 prints ">99%", so a part short of the whole never reads "100%". Moved
 * from calibration/chartData.ts (R3-1a), so R2's gap histogram and R3's card
 * page share one rule.
 */
export function sharePercent(fraction: number): string {
  if (fraction > 0 && fraction < 0.005) return '<1%';
  if (fraction < 1 && fraction >= 0.995) return '>99%';
  return `${Math.round(fraction * 100)}%`;
}
