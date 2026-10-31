// @vitest-environment node
import {describe, it, expect} from 'vitest';
import {
  eventNameFilter,
  breakdownFilter,
  collectEvents,
  queryEvent,
  MAX_FAILURES_IN_A_ROW,
  eventDataDimension,
  breakdownDimension,
  breakdownValueKey,
  reportingWindow,
  resolveWindowDays,
  rowValue,
  buildEvent,
  buildVercelAnalytics,
  emptyVercelAnalytics,
  EVENT_QUERIES,
} from '../vercelAnalytics.mjs';

describe('eventNameFilter', () => {
  it('builds an OData equality filter', () => {
    expect(eventNameFilter('vote_submitted')).toBe("eventName eq 'vote_submitted'");
  });

  it('doubles single quotes in the event name', () => {
    expect(eventNameFilter("o'brien")).toBe("eventName eq 'o''brien'");
  });
});

describe('breakdownFilter', () => {
  it("is the event's filter alone with no where", () => {
    expect(breakdownFilter('binder_view_changed')).toBe("eventName eq 'binder_view_changed'");
  });

  it('narrows the event by each where prop', () => {
    expect(breakdownFilter('binder_view_changed', {control: 'set'})).toBe(
      "eventName eq 'binder_view_changed' and eventData/control eq 'set'",
    );
  });

  it('doubles a quote in a where value', () => {
    expect(breakdownFilter('binder_view_changed', {control: "o'brien"})).toBe(
      "eventName eq 'binder_view_changed' and eventData/control eq 'o''brien'",
    );
  });
});

describe('eventDataDimension', () => {
  it('leaves identifier-safe props bare', () => {
    expect(eventDataDimension('voteType')).toBe('eventData/voteType');
    expect(eventDataDimension('clickedCardInk')).toBe('eventData/clickedCardInk');
  });

  it('single-quotes props with non-identifier characters', () => {
    expect(eventDataDimension('signup-source')).toBe("eventData/'signup-source'");
  });
});

describe('breakdownDimension / breakdownValueKey', () => {
  it('routes eventData breakdowns through eventData/<prop>', () => {
    const bd = {prop: 'voteType', label: 'By vote type'};
    expect(breakdownDimension(bd)).toBe('eventData/voteType');
    expect(breakdownValueKey(bd)).toBe('eventData');
  });

  it('routes automatic dimensions to a bare `by` and reads the value under the dimension key', () => {
    const bd = {prop: 'deviceType', label: 'By device', source: 'dimension'};
    expect(breakdownDimension(bd)).toBe('deviceType');
    expect(breakdownValueKey(bd)).toBe('deviceType');
  });
});

describe('buildEvent breakdowns', () => {
  it('reads dimension values from the dimension-named key', () => {
    const ev = buildEvent({
      name: 'search_submitted',
      label: 'Searches',
      breakdowns: [
        {
          prop: 'deviceType',
          label: 'By device',
          valueKey: 'deviceType',
          rows: [{deviceType: 'mobile', count: 40, visitors: 30}],
        },
      ],
    });
    expect(ev.breakdowns[0].rows[0]).toEqual({value: 'mobile', count: 40, visitors: 30});
  });

  it('sorts numeric breakdowns ascending by value, non-numeric last', () => {
    const ev = buildEvent({
      name: 'vote_submitted',
      label: 'Votes submitted',
      breakdowns: [
        {
          prop: 'engineScore',
          label: 'By engine score',
          valueKey: 'eventData',
          numeric: true,
          rows: [
            {eventData: '9', count: 5},
            {eventData: 'Others', count: 2},
            {eventData: '4', count: 20},
            {eventData: '7', count: 12},
          ],
        },
      ],
    });
    expect(ev.breakdowns[0].rows.map((r) => r.value)).toEqual(['4', '7', '9', 'Others']);
  });

  it('sorts a blank value after the numbers, not to the top (Number("") is 0)', () => {
    const ev = buildEvent({
      name: 'vote_submitted',
      label: 'Votes submitted',
      breakdowns: [
        {
          prop: 'userScore',
          label: 'By user score',
          valueKey: 'eventData',
          numeric: true,
          // rowValue writes '' for a row with no value.
          rows: [{eventData: '7', count: 5}, {count: 9}, {eventData: '0', count: 3}, {eventData: 'Others', count: 2}],
        },
      ],
    });
    expect(ev.breakdowns[0].rows.map((r) => r.value)).toEqual(['0', '7', '', 'Others']);
  });

  it('sorts every other breakdown by count, busiest first, keeping "Others" last', () => {
    // Vercel returns rows by visitors, so the counts arrive out of order.
    const ev = buildEvent({
      name: 'reveal_card_click',
      label: 'Reveal card clicks',
      breakdowns: [
        {
          prop: 'franchise',
          label: 'By franchise',
          valueKey: 'eventData',
          rows: [
            {eventData: 'Big Hero 6', count: 30, visitors: 20},
            {eventData: 'Others', count: 90, visitors: 15},
            {eventData: 'The Sword in the Stone', count: 40, visitors: 12},
            {count: 25, visitors: 10},
            {eventData: 'Frozen', count: 30, visitors: 8},
          ],
        },
      ],
    });
    // Big Hero 6 and Frozen tie at 30: the sort is stable, so Vercel's order holds.
    expect(ev.breakdowns[0].rows.map((r) => [r.value, r.count])).toEqual([
      ['The Sword in the Stone', 40],
      ['Big Hero 6', 30],
      ['Frozen', 30],
      ['', 25],
      ['Others', 90],
    ]);
  });
});

describe('EVENT_QUERIES expansion', () => {
  it('carries numeric score distributions and the device dimension on votes', () => {
    const votes = EVENT_QUERIES.find((q) => q.name === 'vote_submitted');
    expect(votes.breakdowns.some((b) => b.prop === 'engineScore' && b.numeric)).toBe(true);
    expect(votes.breakdowns.some((b) => b.prop === 'deviceType' && b.source === 'dimension')).toBe(true);
  });
});

describe('reportingWindow', () => {
  it('returns YYYY-MM-DD bounds `days` apart', () => {
    const ref = new Date('2026-07-03T12:00:00.000Z');
    expect(reportingWindow(ref, 30)).toEqual({since: '2026-06-03', until: '2026-07-03'});
  });
});

describe('resolveWindowDays', () => {
  it('defaults when unset or invalid', () => {
    expect(resolveWindowDays(undefined)).toBe(60);
    expect(resolveWindowDays('abc')).toBe(60);
    expect(resolveWindowDays('0')).toBe(60);
  });

  it('clamps above the 62-day day-granularity cap (the deploy bug)', () => {
    expect(resolveWindowDays('90')).toBe(62);
  });

  it('passes through valid smaller windows', () => {
    expect(resolveWindowDays('30')).toBe(30);
  });
});

describe('rowValue', () => {
  it('reads the docs-shaped eventData field', () => {
    expect(rowValue({eventData: 'browse', count: 5, visitors: 3}, 'eventData')).toBe('browse');
  });

  it('reads a dimension field by its valueKey', () => {
    expect(rowValue({deviceType: 'mobile', count: 5}, 'deviceType')).toBe('mobile');
  });

  it('falls back to the first non-metric field when the value is under an unexpected key (the label bug)', () => {
    expect(rowValue({source: 'home', count: 5, visitors: 3}, 'eventData')).toBe('home');
    expect(rowValue({'eventData/source': 'gallery', count: 5}, 'eventData')).toBe('gallery');
  });

  it('returns empty string when only metrics/time are present', () => {
    expect(rowValue({count: 5, visitors: 3}, 'eventData')).toBe('');
    expect(rowValue({timestamp: '2026-07-01T00:00:00.000Z', count: 5}, 'eventData')).toBe('');
  });
});

describe('buildEvent', () => {
  it('maps raw API responses into the event shape', () => {
    const ev = buildEvent({
      name: 'vote_submitted',
      label: 'Votes submitted',
      count: {count: 412, visitors: 300},
      trend: [{timestamp: '2026-07-01T00:00:00.000Z', count: 22}],
      breakdowns: [
        {
          prop: 'voteType',
          label: 'By vote type',
          rows: [{eventData: 'quick', count: 250, visitors: 190}],
        },
      ],
    });
    expect(ev.total).toBe(412);
    expect(ev.visitors).toBe(300);
    expect(ev.trend[0]).toEqual({date: '2026-07-01', count: 22});
    expect(ev.breakdowns[0].rows[0]).toEqual({value: 'quick', count: 250, visitors: 190});
  });

  it('defaults missing fields to zero without throwing', () => {
    const ev = buildEvent({name: 'vote_skipped', label: 'Votes skipped'});
    expect(ev.total).toBe(0);
    expect(ev.trend).toEqual([]);
    expect(ev.breakdowns).toEqual([]);
  });
});

describe('buildVercelAnalytics', () => {
  it('flags hasVercelData true when events are present', () => {
    const art = buildVercelAnalytics({
      events: [{name: 'vote_submitted'}],
      window: {since: '2026-06-03', until: '2026-07-03'},
    });
    expect(art.hasVercelData).toBe(true);
    expect(art.reportingWindow.since).toBe('2026-06-03');
    expect(art.events).toHaveLength(1);
    expect(art.unavailable).toEqual([]);
  });

  it('keeps hasVercelData true with every event failed, naming them in unavailable', () => {
    const art = buildVercelAnalytics({
      events: [],
      window: {since: '2026-06-03', until: '2026-07-03'},
      unavailable: ['vote_submitted', 'card_selected'],
    });
    expect(art.hasVercelData).toBe(true);
    expect(art.events).toEqual([]);
    expect(art.unavailable).toEqual(['vote_submitted', 'card_selected']);
  });
});

const WINDOW = {since: '2026-09-01', until: '2026-10-31'};
const QUERY = {
  name: 'friend_binder_opened',
  label: "Friends' binders opened",
  group: 'friends',
  breakdowns: [
    {prop: 'result', label: 'By result'},
    {prop: 'from', label: 'By way in', where: {result: 'shown'}},
  ],
};

/**
 * A fake Vercel: each request is recorded, and `answer(endpoint, params)` gives its
 * data (or throws). By default an event has been sent 4 times and every aggregate
 * is empty.
 */
function fakeAsk(answer = () => undefined) {
  const asked = [];
  const ask = async (endpoint, params) => {
    asked.push({endpoint, ...params});
    const data = answer(endpoint, params);
    if (data !== undefined) return data;
    return endpoint === 'events/count' ? {count: 4, visitors: 2} : [];
  };
  return {ask, asked};
}

describe('queryEvent', () => {
  it('asks an event never sent for its count alone, with no trend or breakdowns', async () => {
    const {ask, asked} = fakeAsk((endpoint) => (endpoint === 'events/count' ? {count: 0, visitors: 0} : undefined));
    const ev = await queryEvent(QUERY, WINDOW, ask);
    expect(asked).toEqual([{endpoint: 'events/count', filter: "eventName eq 'friend_binder_opened'"}]);
    expect(ev).toMatchObject({name: 'friend_binder_opened', group: 'friends', total: 0, trend: [], breakdowns: []});
  });

  it('asks a sent event for its trend and each breakdown, narrowing by where', async () => {
    const {ask, asked} = fakeAsk();
    const ev = await queryEvent(QUERY, WINDOW, ask);
    expect(asked.map((a) => [a.endpoint, a.by ?? null, a.filter])).toEqual([
      ['events/count', null, "eventName eq 'friend_binder_opened'"],
      ['events/aggregate', 'day', "eventName eq 'friend_binder_opened'"],
      ['events/aggregate', 'eventData/result', "eventName eq 'friend_binder_opened'"],
      ['events/aggregate', 'eventData/from', "eventName eq 'friend_binder_opened' and eventData/result eq 'shown'"],
    ]);
    expect(asked[1]).toMatchObject({since: '2026-09-01', until: '2026-10-31'});
    expect(ev.total).toBe(4);
    expect(ev.breakdowns.map((b) => b.label)).toEqual(['By result', 'By way in']);
  });
});

describe('collectEvents', () => {
  const second = {...QUERY, name: 'friend_action', group: 'friends'};

  it("leaves out an event whose breakdown fails, names it with the error, and still asks the next", async () => {
    const {ask, asked} = fakeAsk((endpoint, params) => {
      if (params.by === 'eventData/from') throw new Error('Vercel API events/aggregate 500');
      return undefined;
    });
    const failing = {...QUERY, breakdowns: [{prop: 'from', label: 'By way in'}]};
    const {events, failures} = await collectEvents([failing, {...second, breakdowns: []}], WINDOW, ask);
    expect(failures).toEqual([{name: 'friend_binder_opened', message: 'Vercel API events/aggregate 500'}]);
    expect(events.map((e) => e.name)).toEqual(['friend_action']);
    expect(asked.filter((a) => a.filter === "eventName eq 'friend_action'")).toHaveLength(2);
  });

  it('keeps each event in its group', async () => {
    const {ask} = fakeAsk();
    const {events} = await collectEvents([QUERY, {...second, group: 'cards'}], WINDOW, ask);
    expect(events.map((e) => e.group)).toEqual(['friends', 'cards']);
  });

  it(`stops asking after ${MAX_FAILURES_IN_A_ROW} failures in a row, naming every event left`, async () => {
    const {ask, asked} = fakeAsk(() => {
      throw new Error('Vercel API events/count 401');
    });
    const queries = ['a', 'b', 'c', 'd', 'e'].map((name) => ({...QUERY, name}));
    const {events, failures} = await collectEvents(queries, WINDOW, ask);
    expect(events).toEqual([]);
    expect(asked).toHaveLength(MAX_FAILURES_IN_A_ROW);
    expect(failures.map((f) => f.name)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(failures[3].message).toBe('not asked after 3 failures in a row');
  });

  it('starts the count of failures in a row again after an event that succeeds', async () => {
    const failingNames = new Set(['a', 'b', 'd', 'e']);
    const {ask} = fakeAsk((_endpoint, params) => {
      if ([...failingNames].some((name) => params.filter === `eventName eq '${name}'`)) throw new Error('500');
      return {count: 0, visitors: 0};
    });
    const queries = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => ({...QUERY, name}));
    const {events, failures} = await collectEvents(queries, WINDOW, ask);
    expect(events.map((e) => e.name)).toEqual(['c', 'f']);
    expect(failures.map((f) => f.message)).toEqual(['500', '500', '500', '500']);
  });
});

describe('emptyVercelAnalytics', () => {
  it('is a valid empty artifact', () => {
    expect(emptyVercelAnalytics()).toEqual({hasVercelData: false, reportingWindow: null, events: []});
  });
});

describe('EVENT_QUERIES', () => {
  it('covers all 31 catalog events with stable names, in order', () => {
    expect(EVENT_QUERIES.map((q) => q.name)).toEqual([
      'reveal_card_click',
      'vote_submitted',
      'card_selected',
      'synergy_card_clicked',
      'playstyle_opened',
      'vote_skipped',
      'search_submitted',
      'filter_applied',
      'sort_changed',
      'synergy_group_viewed',
      'card_printing_view',
      'sign_in_shown',
      'sign_in_started',
      'sign_in_completed',
      'sign_in_failed',
      'collection_mode_toggled',
      'collection_started',
      'collection_start_failed',
      'collection_import_opened',
      'collection_imported',
      'collection_import_failed',
      'collection_deleted',
      'collection_copies_changed',
      'binder_view_changed',
      'binder_page_turned',
      'friend_code_copied',
      'friend_request_sent',
      'friend_action',
      'collection_sharing_changed',
      'friend_binder_opened',
      'friends_who_have_it_opened',
    ]);
  });

  it('files every query under one of the four groups', () => {
    const groups = new Set(['cards', 'sign_in', 'collection', 'friends']);
    expect(EVENT_QUERIES.filter((q) => !groups.has(q.group)).map((q) => q.name)).toEqual([]);
  });

  it("breaks binder_view_changed's value down one control at a time", () => {
    const binder = EVENT_QUERIES.find((q) => q.name === 'binder_view_changed');
    expect(binder.breakdowns.filter((b) => b.where).map((b) => [b.label, b.where])).toEqual([
      ['Sets picked', {control: 'set'}],
      ['Show picked', {control: 'show'}],
      ['Headline picked', {control: 'axis'}],
    ]);
  });
});
