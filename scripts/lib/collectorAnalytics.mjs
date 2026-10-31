/**
 * Returning collectors, from the app's `collections` table: one row per account,
 * whose `created_at` is the account's first save (a start or an import) and whose
 * `updated_at` is its latest, which every save moves forward (the table's
 * set_updated_at trigger). A collection needs an account, so a row is one
 * collector; PostHog can't count returns, since its cookieless identities reset
 * daily. No network or filesystem here beyond the client the orchestrator
 * (scripts/precompute-collector-analytics.mjs) hands in, so `pnpm test:scripts`
 * drives it with a fake.
 *
 * What the two timestamps can't say: how often a collector comes back (only the
 * latest save survives), a visit that only looks at the binder (opening it writes
 * nothing), or a collector whose collection was cleared (the row goes). A card id
 * fix (internal.remap_card_ids) also moves `updated_at` on each collection it
 * changes, so it reads as a save.
 */
import {fetchAllRows} from './supabaseRows.mjs';

const DAY_MS = 86_400_000;

/** The two columns the counts need. Never owner_id or entries: no id leaves the database. */
export const COLLECTOR_COLUMNS = 'created_at, updated_at';

/** The table's key orders the pages from inside the database, so the read never returns it. */
const COLLECTOR_ORDER = ['owner_id'];

/** The UTC Monday that starts `ms`'s week, as YYYY-MM-DD. */
export function weekStart(ms) {
  const day = new Date(ms);
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - sinceMonday))
    .toISOString()
    .slice(0, 10);
}

/** Whether `ms` falls in the `days` before `now`. */
const inLast = (ms, now, days) => ms > now - days * DAY_MS;

/** Whether `ms` is `days` or more before `now`. */
const atLeastAgo = (ms, now, days) => ms <= now - days * DAY_MS;

/** Whether the collector saved `days` or more after their first save. */
const savedAfter = (collector, days) => collector.latest - collector.first >= days * DAY_MS;

/**
 * A save in the last `days` from a collector whose first save came before them.
 * Exact, since a later save only moves `updated_at` forward.
 */
const returnedWithin = (collector, now, days) =>
  inLast(collector.latest, now, days) && atLeastAgo(collector.first, now, days);

/** How many of `items` pass `test`. */
function countWhere(items, test) {
  return items.reduce((n, item) => n + (test(item) ? 1 : 0), 0);
}

/**
 * One start week's row. `weekInOf` counts its collectors whose first save is a week
 * old or more, so each has had a week to come back; `weekIn` those of them who saved
 * again a week or more after their first.
 */
function weekRow(week, members, now) {
  const weekOld = members.filter((collector) => atLeastAgo(collector.first, now, 7));
  return {
    week,
    started: members.length,
    cameBack: countWhere(members, (collector) => savedAfter(collector, 1)),
    weekIn: countWhere(weekOld, (collector) => savedAfter(collector, 7)),
    weekInOf: weekOld.length,
    active7: countWhere(members, (collector) => inLast(collector.latest, now, 7)),
  };
}

/** One row per start week with at least one start, newest first. */
function startWeeks(collectors, now) {
  const byWeek = new Map();
  for (const collector of collectors) {
    const week = weekStart(collector.first);
    byWeek.set(week, [...(byWeek.get(week) ?? []), collector]);
  }
  return [...byWeek.keys()]
    .sort()
    .reverse()
    .map((week) => weekRow(week, byWeek.get(week), now));
}

/**
 * The counts from `rows` ({created_at, updated_at}) as of `now` (ms). A return is a
 * save a day or more after the first.
 */
export function buildCollectorAnalytics({rows, now}) {
  const collectors = rows.map((row) => ({first: Date.parse(row.created_at), latest: Date.parse(row.updated_at)}));
  return {
    hasData: true,
    collectors: collectors.length,
    new7: countWhere(collectors, (collector) => inLast(collector.first, now, 7)),
    returning7: countWhere(collectors, (collector) => returnedWithin(collector, now, 7)),
    returning30: countWhere(collectors, (collector) => returnedWithin(collector, now, 30)),
    cameBack: countWhere(collectors, (collector) => savedAfter(collector, 1)),
    weeks: startWeeks(collectors, now),
  };
}

/**
 * The artifact for the page: the counts, or why there are none. A failed read gives
 * the page a reason instead of failing the nightly deploy. The warning carries
 * Supabase's message, never a row or a count.
 */
export async function collectorArtifact({client, now}) {
  if (!client) return {hasData: false, reason: 'no-key'};
  try {
    const rows = await fetchAllRows(client, {table: 'collections', columns: COLLECTOR_COLUMNS, order: COLLECTOR_ORDER});
    return buildCollectorAnalytics({rows, now});
  } catch (err) {
    console.warn(`  ⚠ ${err.message}`);
    return {hasData: false, reason: 'read-failed'};
  }
}
