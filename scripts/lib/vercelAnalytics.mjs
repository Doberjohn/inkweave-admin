/**
 * The Vercel Web Analytics precompute's queries and transforms. No network or
 * filesystem here, so this module is unit-tested by `pnpm test:scripts`: the
 * orchestrator (scripts/precompute-vercel-analytics.mjs) hands collectEvents the
 * function that asks Vercel, and writes the artifact the web app reads from
 * /admin-data/vercel-analytics.json.
 *
 * The Vercel Web Analytics Query API speaks OData: you narrow a dataset with a
 * `filter` expression and group it with a `by` dimension. See
 * https://vercel.com/docs/analytics/web-analytics-api
 */

/** An automatic dimension breakdown by device type, which every event can carry. */
const BY_DEVICE = {prop: 'deviceType', label: 'By device', source: 'dimension'};

/**
 * Which custom events to pull and how to break each one down. Each query names its
 * `group`, the heading the Web analytics page files its card under: 'cards',
 * 'sign_in', 'collection' or 'friends'. A breakdown is:
 *   {prop, label, source?: 'eventData' | 'dimension', numeric?: boolean, limit?: number, where?: {prop: value}}
 *
 * - source 'eventData' (default): a property sent with track() — grouped by
 *   `eventData/<prop>`, value returned under the row's `eventData` field.
 * - source 'dimension': a Vercel automatic dimension (deviceType, country, …) —
 *   grouped by a bare `by=<prop>`, value returned under the row's `<prop>` field.
 * - numeric: sort rows by their numeric value ascending, so score breakdowns read
 *   as a distribution rather than a top-N-by-count list. Every other breakdown is
 *   sorted by count, busiest first (Vercel returns rows by visitors).
 * - where: narrow the breakdown to the events whose eventData props hold these
 *   values, for a prop whose meaning depends on another (binder_view_changed's
 *   `value` is a set code, a Show or a headline by its `control`).
 *
 * Every eventData `prop`, and every prop a `where` names, is declared on its event in
 * the AnalyticsEvents catalog (apps/web/src/shared/lib/analytics.ts), which
 * eventCatalog.test.mjs checks at the pinned app. Breakdowns by a count (an import's
 * `cards`) are left out: each event has its own number, so a top-N of them says nothing.
 * Edit this table to add or drop dimensions.
 */
export const EVENT_QUERIES = [
  {
    name: 'reveal_card_click',
    label: 'Reveal card clicks',
    group: 'cards',
    breakdowns: [
      {prop: 'source', label: 'By source'},
      {prop: 'franchise', label: 'By franchise', limit: 12},
      {prop: 'ink', label: 'By ink'},
      {prop: 'type', label: 'By card type'},
      {prop: 'rarity', label: 'By rarity'},
      BY_DEVICE,
    ],
  },
  {
    name: 'vote_submitted',
    label: 'Votes submitted',
    group: 'cards',
    breakdowns: [
      {prop: 'voteType', label: 'By vote type'},
      {prop: 'engineScore', label: 'By engine score', numeric: true, limit: 12},
      {prop: 'userScore', label: 'By user score', numeric: true, limit: 12},
      BY_DEVICE,
    ],
  },
  {
    name: 'card_selected',
    label: 'Card details opened',
    group: 'cards',
    breakdowns: [
      {prop: 'source', label: 'By source'},
      {prop: 'ink', label: 'By ink'},
      {prop: 'type', label: 'By card type'},
    ],
  },
  {
    name: 'synergy_card_clicked',
    label: 'Synergy cards followed',
    group: 'cards',
    breakdowns: [
      {prop: 'clickedCardInk', label: 'By ink'},
      {prop: 'clickedCardName', label: 'Top cards', limit: 10},
      {prop: 'groupKey', label: 'By synergy group', limit: 10},
      {prop: 'surface', label: 'By surface'},
    ],
  },
  {
    name: 'playstyle_opened',
    label: 'Playstyles opened',
    group: 'cards',
    breakdowns: [{prop: 'playstyleId', label: 'By playstyle', limit: 15}],
  },
  {
    name: 'vote_skipped',
    label: 'Votes skipped',
    group: 'cards',
    breakdowns: [{prop: 'engineScore', label: 'By engine score', numeric: true, limit: 12}],
  },
  {
    name: 'search_submitted',
    label: 'Searches',
    group: 'cards',
    breakdowns: [
      {prop: 'source', label: 'By source'},
      {prop: 'query', label: 'Top queries', limit: 10},
      BY_DEVICE,
    ],
  },
  {
    name: 'filter_applied',
    label: 'Filters applied',
    group: 'cards',
    breakdowns: [
      {prop: 'facet', label: 'By facet'},
      {prop: 'value', label: 'By value', limit: 20},
      {prop: 'action', label: 'By action'},
      {prop: 'via', label: 'By how'},
      BY_DEVICE,
    ],
  },
  {
    name: 'sort_changed',
    label: 'Sort changes',
    group: 'cards',
    breakdowns: [{prop: 'sortOrder', label: 'By sort order'}],
  },
  {
    name: 'synergy_group_viewed',
    label: 'Synergy groups viewed',
    group: 'cards',
    breakdowns: [
      {prop: 'action', label: 'By action'},
      {prop: 'groupKey', label: 'By synergy group', limit: 10},
      {prop: 'surface', label: 'By surface'},
    ],
  },
  {
    name: 'card_printing_view',
    label: 'Printings viewed',
    group: 'cards',
    breakdowns: [
      {prop: 'rarity', label: 'By rarity'},
      {prop: 'surface', label: 'By surface'},
      BY_DEVICE,
    ],
  },
  {
    name: 'sign_in_shown',
    label: 'Sign-in shown',
    group: 'sign_in',
    breakdowns: [{prop: 'surface', label: 'By surface'}, BY_DEVICE],
  },
  {
    name: 'sign_in_started',
    label: 'Sign-ins started',
    group: 'sign_in',
    breakdowns: [
      {prop: 'provider', label: 'By provider'},
      {prop: 'surface', label: 'By surface'},
    ],
  },
  {
    name: 'sign_in_completed',
    label: 'Sign-ins completed',
    group: 'sign_in',
    breakdowns: [{prop: 'provider', label: 'By provider'}],
  },
  {
    name: 'sign_in_failed',
    label: 'Sign-ins failed',
    group: 'sign_in',
    breakdowns: [
      {prop: 'stage', label: 'By stage'},
      {prop: 'reason', label: 'By reason'},
      {prop: 'provider', label: 'By provider'},
    ],
  },
  {
    name: 'collection_mode_toggled',
    label: 'Collection mode switched',
    group: 'collection',
    breakdowns: [{prop: 'state', label: 'By state'}, BY_DEVICE],
  },
  {
    name: 'collection_started',
    label: 'Empty collections started',
    group: 'collection',
    breakdowns: [{prop: 'surface', label: 'By surface'}],
  },
  {
    name: 'collection_start_failed',
    label: 'Starts failed',
    group: 'collection',
    breakdowns: [
      {prop: 'reason', label: 'By reason'},
      {prop: 'surface', label: 'By surface'},
    ],
  },
  {
    name: 'collection_import_opened',
    label: 'Imports opened',
    group: 'collection',
    breakdowns: [
      {prop: 'surface', label: 'By surface'},
      {prop: 'replacing', label: 'By replacing'},
    ],
  },
  {
    name: 'collection_imported',
    label: 'Collections imported',
    group: 'collection',
    breakdowns: [
      {prop: 'surface', label: 'By surface'},
      {prop: 'replacing', label: 'By replacing'},
    ],
  },
  {
    name: 'collection_import_failed',
    label: 'Imports failed',
    group: 'collection',
    breakdowns: [
      {prop: 'reason', label: 'By reason'},
      {prop: 'surface', label: 'By surface'},
    ],
  },
  {
    name: 'collection_deleted',
    label: 'Collections deleted',
    group: 'collection',
    breakdowns: [BY_DEVICE],
  },
  {
    name: 'collection_copies_changed',
    label: 'Copies set by hand',
    group: 'collection',
    breakdowns: [
      {prop: 'surface', label: 'By surface'},
      {prop: 'mode', label: 'By mode'},
      {prop: 'change', label: 'By change'},
      {prop: 'finish', label: 'By finish'},
      {prop: 'newCard', label: 'By new card'},
    ],
  },
  {
    name: 'binder_view_changed',
    label: 'Binder views picked',
    group: 'collection',
    breakdowns: [
      {prop: 'control', label: 'By control'},
      {prop: 'value', label: 'Sets picked', where: {control: 'set'}},
      {prop: 'value', label: 'Show picked', where: {control: 'show'}},
      {prop: 'value', label: 'Headline picked', where: {control: 'axis'}},
      {prop: 'friend', label: 'By binder'},
    ],
  },
  {
    name: 'binder_page_turned',
    label: 'Binder pages turned',
    group: 'collection',
    breakdowns: [
      {prop: 'method', label: 'By method'},
      {prop: 'layout', label: 'By layout'},
    ],
  },
  {
    name: 'friend_code_copied',
    label: 'Friend codes copied',
    group: 'friends',
    breakdowns: [{prop: 'result', label: 'By result'}],
  },
  {
    name: 'friend_request_sent',
    label: 'Friend requests sent',
    group: 'friends',
    breakdowns: [{prop: 'result', label: 'By result'}],
  },
  {
    name: 'friend_action',
    label: 'Friend actions',
    group: 'friends',
    breakdowns: [
      {prop: 'action', label: 'By action'},
      {prop: 'ok', label: 'By success'},
    ],
  },
  {
    name: 'collection_sharing_changed',
    label: 'Sharing switched',
    group: 'friends',
    breakdowns: [{prop: 'state', label: 'By state'}],
  },
  {
    name: 'friend_binder_opened',
    label: "Friends' binders opened",
    group: 'friends',
    breakdowns: [
      {prop: 'result', label: 'By result'},
      {prop: 'from', label: 'By way in'},
    ],
  },
  {
    name: 'friends_who_have_it_opened',
    label: 'Friends who have it opened',
    group: 'friends',
    breakdowns: [{prop: 'from', label: 'By where opened'}],
  },
];

/** Fallback top-N when a breakdown does not set its own `limit`. */
export const DEFAULT_BREAKDOWN_LIMIT = 20;

/** OData filter selecting one custom event by name (single quotes doubled per OData). */
export function eventNameFilter(eventName) {
  return `eventName eq '${eventName.replace(/'/g, "''")}'`;
}

/** The OData filter for one breakdown: its event's, narrowed by `where` ({prop: value}). */
export function breakdownFilter(eventName, where = {}) {
  const narrowed = Object.entries(where).map(
    ([prop, value]) => `${eventDataDimension(prop)} eq '${String(value).replace(/'/g, "''")}'`,
  );
  return [eventNameFilter(eventName), ...narrowed].join(' and ');
}

/**
 * OData `by` dimension for grouping a custom event by one of its eventData properties.
 * An identifier-safe name (letters, digits, underscore) is referenced bare
 * (`eventData/voteType`); any other character forces single-quoting, with internal
 * quotes doubled per OData (`eventData/'signup-source'`). See the Web Analytics API docs.
 */
export function eventDataDimension(prop) {
  if (/^[A-Za-z0-9_]+$/.test(prop)) return `eventData/${prop}`;
  return `eventData/'${prop.replace(/'/g, "''")}'`;
}

/** The `by` value for a breakdown: a bare automatic dimension, or an eventData key. */
export function breakdownDimension(breakdown) {
  return breakdown.source === 'dimension' ? breakdown.prop : eventDataDimension(breakdown.prop);
}

/** The row field the grouped value lands in: the dimension name, or `eventData`. */
export function breakdownValueKey(breakdown) {
  return breakdown.source === 'dimension' ? breakdown.prop : 'eventData';
}

/** Default trend/breakdown lookback in days. */
export const DEFAULT_WINDOW_DAYS = 60;

/**
 * Vercel caps day-granularity (`by=day`) aggregate queries at 62 days of data, so the
 * trend query can't look back further. Clamp the whole window to stay within the cap.
 */
export const MAX_WINDOW_DAYS = 62;

/** Resolve the configured window (an env string) to a valid day count within the API cap. */
export function resolveWindowDays(envValue) {
  const n = Number(envValue);
  const days = Number.isFinite(n) && n > 0 ? n : DEFAULT_WINDOW_DAYS;
  return Math.min(days, MAX_WINDOW_DAYS);
}

/**
 * Reporting window [since, until] as YYYY-MM-DD strings, `days` back from `reference`
 * (a Date). Aggregate queries only see data inside the plan's reporting window, so the
 * orchestrator bounds every trend/breakdown request with this.
 */
export function reportingWindow(reference, days) {
  const until = reference.toISOString().slice(0, 10);
  const since = new Date(reference.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  return {since, until};
}

/** Row fields that carry metrics/time, not the grouped value. */
const ROW_METRIC_KEYS = new Set(['count', 'visitors', 'timestamp', 'date']);

/** A usable grouped value: present and non-empty. */
const isPresentValue = (v) => v != null && v !== '';

/**
 * The grouped value for an aggregate row, robust to the API's field naming. Vercel's docs
 * show it under `eventData`, but real `by=eventData/<prop>` responses put the value under a
 * different key, so we fall back to the first non-metric field on the row.
 */
export function rowValue(row, valueKey) {
  if (valueKey && isPresentValue(row[valueKey])) return String(row[valueKey]);
  if (isPresentValue(row.eventData)) return String(row.eventData);
  const found = Object.entries(row).find(([key, value]) => !ROW_METRIC_KEYS.has(key) && isPresentValue(value));
  return found ? String(found[1]) : '';
}

/** The value Vercel gives the row that folds a breakdown's tail beyond its query limit. */
const OTHERS_VALUE = 'Others';

/** A row's value as a number, or NaN when it isn't one. A blank value isn't, though Number('') is 0. */
function numericValue(row) {
  return row.value.trim() === '' ? NaN : Number(row.value);
}

/**
 * Numeric-ascending comparator that pushes non-numeric values (a blank or an
 * "Others" row) last, keeping their order among themselves.
 */
function byNumericValue(a, b) {
  const na = numericValue(a);
  const nb = numericValue(b);
  if (Number.isNaN(na)) return Number.isNaN(nb) ? 0 : 1;
  if (Number.isNaN(nb)) return -1;
  return na - nb;
}

/**
 * Count-descending comparator that keeps the "Others" row last. Vercel returns
 * breakdown rows by visitors, so a later row can outnumber an earlier one; this
 * makes the bars fall monotonically. Sort is stable, so ties keep Vercel's order.
 */
function byCount(a, b) {
  const othersLast = Number(a.value === OTHERS_VALUE) - Number(b.value === OTHERS_VALUE);
  return othersLast || b.count - a.count;
}

/**
 * Fold the raw API results for one event into the artifact's event shape, keeping
 * its query's `group`. `count` is the events/count response body's `data`; `trend`
 * the by=day aggregate rows; `breakdowns` an array of {prop, label, valueKey?,
 * numeric?, rows} where each raw row carries `count`, `visitors`, and the grouped
 * value under `valueKey`.
 * Numeric breakdowns come out in value order, with the rows that aren't numbers
 * ("Others", a blank) after them; every other breakdown busiest first, "Others" last.
 */
export function buildEvent({name, label, group, count, trend, breakdowns}) {
  return {
    name,
    label,
    group,
    total: count?.count ?? 0,
    visitors: count?.visitors ?? 0,
    trend: (trend ?? []).map((row) => ({
      date: (row.timestamp ?? row.date ?? '').slice(0, 10),
      count: row.count ?? 0,
    })),
    breakdowns: (breakdowns ?? []).map((b) => {
      const rows = (b.rows ?? []).map((row) => ({
        value: rowValue(row, b.valueKey),
        count: row.count ?? 0,
        visitors: row.visitors ?? 0,
      }));
      rows.sort(b.numeric ? byNumericValue : byCount);
      return {prop: b.prop, label: b.label, rows};
    }),
  };
}

/**
 * The requests for one event, through `ask(endpoint, params)`, which resolves to the
 * response's `data`: its all-time count, then, if it has ever been sent, its by-day
 * trend over the window and each breakdown. An event never sent has no trend or
 * breakdowns to ask for, which keeps a run's requests down while the launch's
 * events wait behind their flags.
 */
export async function queryEvent(query, window, ask) {
  const count = await ask('events/count', {filter: eventNameFilter(query.name)});
  if (!count?.count) return buildEvent({...query, count, trend: [], breakdowns: []});
  const inWindow = {since: window.since, until: window.until};
  const trend = await ask('events/aggregate', {...inWindow, by: 'day', filter: eventNameFilter(query.name)});
  const breakdowns = [];
  for (const b of query.breakdowns) {
    const rows = await ask('events/aggregate', {
      ...inWindow,
      by: breakdownDimension(b),
      filter: breakdownFilter(query.name, b.where),
      limit: String(b.limit ?? DEFAULT_BREAKDOWN_LIMIT),
    });
    breakdowns.push({prop: b.prop, label: b.label, valueKey: breakdownValueKey(b), numeric: b.numeric, rows});
  }
  return buildEvent({...query, count, trend, breakdowns});
}

/**
 * After this many events fail one after another, the rest aren't asked: Vercel is
 * down or refusing the token, and with each request's 30-second deadline a stalled
 * API would otherwise hold the deploy for a quarter of an hour.
 */
export const MAX_FAILURES_IN_A_ROW = 3;

/**
 * Every query's event, asked of Vercel through `ask` one request at a time. An event
 * whose requests fail is left out and listed in `failures` with the error's message,
 * so one failure costs that event alone. Once MAX_FAILURES_IN_A_ROW have failed in a
 * row, each event left is listed too, unasked.
 */
export async function collectEvents(queries, window, ask) {
  const events = [];
  const failures = [];
  let inARow = 0;
  for (const query of queries) {
    if (inARow >= MAX_FAILURES_IN_A_ROW) {
      failures.push({name: query.name, message: `not asked after ${inARow} failures in a row`});
      continue;
    }
    try {
      events.push(await queryEvent(query, window, ask));
      inARow = 0;
    } catch (error) {
      failures.push({name: query.name, message: error.message});
      inARow += 1;
    }
  }
  return {events, failures};
}

/**
 * Assemble the full artifact object (generatedAt is stamped by the orchestrator).
 * It has Vercel data whenever the token and project were there to ask with, even if
 * every event failed: `unavailable` names those, so the page says what failed
 * instead of asking for a token that is already set.
 */
export function buildVercelAnalytics({events, window, unavailable = []}) {
  return {
    hasVercelData: true,
    reportingWindow: window ?? null,
    events,
    unavailable,
  };
}

/**
 * The artifact for a run that failed outside its per-event handling: every query's
 * event named unavailable, so the page says the read failed. The empty file would
 * ask for a token that is already set.
 */
export function failedRunAnalytics(queries) {
  return buildVercelAnalytics({events: [], window: null, unavailable: queries.map((query) => query.name)});
}

/**
 * The empty-but-valid artifact written when the Vercel token/project env is absent,
 * so the page asks for them. It has no `unavailable`, which reads as none.
 */
export function emptyVercelAnalytics() {
  return {hasVercelData: false, reportingWindow: null, events: []};
}
