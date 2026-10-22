import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {HISTORY_PAGE} from '../../../github/githubHistory';
import {
  byDay,
  changeTitle,
  emptyStream,
  filterChanges,
  localDay,
  localTime,
  mergedChanges,
  toChange,
  withPage,
  type Change,
  type PathStream,
} from '../historyModel';
import {listed} from './historyHarness';

// Days and times are the viewer's: Athens is UTC+3 until the clocks change on Oct 25.
// The zone is this file's alone: afterAll puts the previous one back (chartData.test.ts).
const ORIGINAL_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
beforeAll(() => {
  vi.stubEnv('TZ', 'Europe/Athens');
});
afterAll(() => {
  vi.stubEnv('TZ', ORIGINAL_ZONE);
  vi.unstubAllEnvs();
});

/** A change to `areas` at `date`. */
function change(sha: string, date: string, areas: Change['areas'] = ['data']): Change {
  return {sha, date, headline: `chore: ${sha}`, author: 'Doberjohn', areas, automatic: false};
}

/** A stream of `changes`, `done` or with more to read. */
function stream(area: Change['areas'][number], changes: Change[], done: boolean): PathStream {
  return {path: area, area, changes, pages: 1, done};
}

describe('toChange', () => {
  it('takes the headline, the commit time and the GitHub account', () => {
    const commit = listed({sha: 'abc', date: '2026-10-22T13:39:00Z', message: 'fix(collection): set 220 promo printings to foil only\n\nThe body.'});
    expect(toChange(commit, 'data')).toEqual({
      sha: 'abc',
      date: '2026-10-22T13:39:00Z',
      headline: 'fix(collection): set 220 promo printings to foil only',
      author: 'Doberjohn',
      areas: ['data'],
      automatic: false,
    });
  });

  it("names an author GitHub doesn't know by the commit's name", () => {
    expect(toChange(listed({sha: 'a', date: '2026-10-22T10:00:00Z', message: 'x', login: null}), 'cards').author).toBe('Someone');
  });

  it("marks convert-reveal-images' commits automatic, and nothing else", () => {
    const convert = 'chore(reveals): convert raw scans to AVIF [skip ci]';
    const of = (message: string, login: string) => toChange(listed({sha: 'a', date: '2026-10-08T12:00:00Z', message, login}), 'scans');
    expect(of(convert, 'github-actions[bot]').automatic).toBe(true);
    expect(of(convert, 'Doberjohn').automatic).toBe(false);
    expect(of('chore(data): refresh the card data', 'github-actions[bot]').automatic).toBe(false);
  });
});

describe('withPage', () => {
  it('adds a page after the ones read, and is done once a page comes back short', () => {
    const full = Array.from({length: HISTORY_PAGE}, (_, i) => listed({sha: `s${i}`, date: '2026-10-01T00:00:00Z', message: 'x'}));
    const first = withPage(emptyStream({path: 'p', area: 'tuning'}), full);
    expect(first).toMatchObject({path: 'p', area: 'tuning', pages: 1, done: false});
    const second = withPage(first, full.slice(0, 3));
    expect(second.changes).toHaveLength(HISTORY_PAGE + 3);
    expect(second).toMatchObject({pages: 2, done: true});
  });
});

describe('mergedChanges', () => {
  it('lists a commit that changed two paths once, with both areas in their order', () => {
    const shared = change('both', '2026-10-14T01:04:00Z');
    const merged = mergedChanges([stream('cards', [{...shared, areas: ['cards']}], true), stream('data', [shared], true)]);
    expect(merged.changes).toEqual([{...shared, areas: ['cards', 'data']}]);
  });

  it('lists the newest first and leaves the automatic ones out', () => {
    const bot = {...change('bot', '2026-10-08T12:00:00Z', ['scans']), automatic: true};
    const merged = mergedChanges([
      stream('scans', [change('scan', '2026-10-08T11:00:00Z', ['scans']), bot], true),
      stream('tuning', [change('tune', '2026-10-19T08:35:00Z', ['tuning'])], true),
    ]);
    expect(merged.changes.map(({sha}) => sha)).toEqual(['tune', 'scan']);
    expect(merged.hasOlder).toBe(false);
  });

  // The scans' next page may hold a change from Oct 3, which would land between the two
  // tuning changes, so the older one waits for it.
  it('holds back what is older than a path with more to read has reached', () => {
    const tuning = stream('tuning', [change('new', '2026-10-19T00:00:00Z'), change('old', '2026-09-01T00:00:00Z')], true);
    const scans = stream('scans', [change('scan', '2026-10-05T00:00:00Z', ['scans'])], false);
    const merged = mergedChanges([tuning, scans]);
    expect(merged.changes.map(({sha}) => sha)).toEqual(['new', 'scan']);
    expect(merged.hasOlder).toBe(true);
    expect(mergedChanges([tuning, {...scans, done: true}]).changes.map(({sha}) => sha)).toEqual(['new', 'scan', 'old']);
  });

  it('reaches the oldest date a path has read, wherever GitHub listed it', () => {
    // GitHub's order is not strictly by date: the older one is listed first here.
    const scans = stream('scans', [change('older', '2026-10-01T00:00:00Z'), change('newer', '2026-10-02T00:00:00Z')], false);
    const tuning = stream('tuning', [change('between', '2026-10-01T12:00:00Z')], true);
    expect(mergedChanges([scans, tuning]).changes.map(({sha}) => sha)).toEqual(['newer', 'between', 'older']);
  });
});

describe('filterChanges', () => {
  const changes = [change('a', '2026-10-02T00:00:00Z', ['cards', 'scans']), change('b', '2026-10-01T00:00:00Z', ['tuning'])];

  it('keeps every change for All, and the ones that touched an area for that area', () => {
    expect(filterChanges(changes, 'all')).toBe(changes);
    expect(filterChanges(changes, 'scans').map(({sha}) => sha)).toEqual(['a']);
    expect(filterChanges(changes, 'data')).toEqual([]);
  });
});

describe('changeTitle', () => {
  it.each([
    ['feat(reveals): add Chemical Reaction (1499)', 'Add Chemical Reaction (1499)'],
    ['chore(collection): set the versions of 1 printing from Card studio', 'Set the versions of 1 printing from Card studio'],
    ['feat!: drop the old format', 'Drop the old format'],
    ['Merge pull request #900 from Doberjohn/fix/promos-foil-only', 'Merge pull request #900 from Doberjohn/fix/promos-foil-only'],
    ['Set 14 reveals: 16 cards (2026-10-01)', 'Set 14 reveals: 16 cards (2026-10-01)'],
  ])('titles "%s" as "%s"', (headline, title) => {
    expect(changeTitle(headline)).toBe(title);
  });
});

describe('the viewer’s days', () => {
  it('reads a time in the viewer’s zone', () => {
    expect(localDay('2026-10-21T22:30:00Z')).toBe('2026-10-22');
    expect(localTime('2026-10-21T22:30:00Z')).toBe('01:30');
  });

  it('cuts the list into the viewer’s days, newest first', () => {
    const late = change('late', '2026-10-21T22:30:00Z');
    const morning = change('morning', '2026-10-22T06:00:00Z');
    const before = change('before', '2026-10-21T20:00:00Z');
    expect(byDay([morning, late, before])).toEqual([
      {day: '2026-10-22', changes: [morning, late]},
      {day: '2026-10-21', changes: [before]},
    ]);
  });
});
