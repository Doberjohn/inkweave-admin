import {afterEach, describe, expect, it, vi} from 'vitest';
import {base64ToUtf8} from '../../../test/base64';
import {featuredIdsJson} from '../../../app-bridge';
import {GOLIATH, SIX, entriesFor, featuredFileText} from '../featuredFixtures';
import {featuredFailureKind} from '../featuredFailure';
import {changedSlots} from '../featuredSlots';
import {commitFeatured, featuredCommitMessage, parseFeatured, readFeatured} from '../githubClient';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** What the branch's file says at the base commit, for the GitHub stub. */
let baseFile = featuredFileText();
/** The tree GitHub builds: the base's own when the file is unchanged, so commitFiles refuses it. */
let builtTree = 'tree2';

// Table-driven GitHub stub: [url matcher, body]. Branch-free, for the complexity gate.
const ROUTES: [(url: string) => boolean, () => string][] = [
  [(u) => u.includes('/contents/'), () => baseFile],
  [(u) => u.endsWith('/git/ref/heads/master'), () => JSON.stringify({object: {sha: 'base1'}})],
  [(u) => u.includes('/git/commits/base1'), () => JSON.stringify({tree: {sha: 'tree1'}})],
  [(u) => u.endsWith('/git/blobs'), () => JSON.stringify({sha: 'blob1'})],
  [(u) => u.endsWith('/git/trees'), () => JSON.stringify({sha: builtTree})],
  [(u) => u.endsWith('/git/commits'), () => JSON.stringify({sha: 'commit2', html_url: 'https://github.com/x/y/commit/commit2'})],
  [(u) => u.endsWith('/git/refs/heads/master'), () => '{}'],
];

/** Stubs GitHub, recording each call's URL and JSON body. */
function stubGithub() {
  const calls: {url: string; body?: {content?: string; message?: string}}[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    calls.push({url: String(url), body: init?.body ? JSON.parse(init.body as string) : undefined});
    const route = ROUTES.find(([match]) => match(String(url)));
    if (!route) throw new Error(`unexpected url ${String(url)}`);
    return new Response(route[1]());
  });
  return calls;
}

const LOADED = entriesFor(SIX);
const PICKED = entriesFor([SIX[0], GOLIATH, ...SIX.slice(2)]);

describe('readFeatured', () => {
  it('returns the branch file’s six entries', async () => {
    baseFile = featuredFileText();
    stubGithub();
    expect(await readFeatured('tok')).toEqual(LOADED);
  });

  it.each([
    ['text that isn’t JSON', 'not json', 'featuredCardIds.json is not JSON'],
    ['five entries', featuredIdsJson(LOADED.slice(0, 5)), 'featuredCardIds.json lists 5 cards, not 6'],
    ['an entry without an id', JSON.stringify([...LOADED.slice(0, 5), {card: 'Steel: Tiana'}]), 'featuredCardIds.json entry 6 is not'],
    ['an object', '{}', 'featuredCardIds.json is not a list'],
  ])('refuses %s, naming the file', (_, text, message) => {
    expect(() => parseFeatured(text)).toThrow(message);
  });
});

describe('commitFeatured', () => {
  it('writes exactly featuredIdsJson of the six, read at the commit it builds on', async () => {
    baseFile = featuredFileText();
    builtTree = 'tree2';
    const calls = stubGithub();
    await commitFeatured({token: 'tok', entries: PICKED, loaded: LOADED, changes: changedSlots(LOADED, PICKED)});
    expect(calls.find((c) => c.url.includes('/contents/'))?.url).toContain('?ref=base1');
    expect(base64ToUtf8(calls.find((c) => c.url.endsWith('/git/blobs'))?.body?.content ?? '')).toBe(featuredIdsJson(PICKED));
    expect(calls.find((c) => c.url.endsWith('/git/commits'))?.body?.message).toBe(
      "chore(cards): change the homepage's featured cards\n\nAmethyst: Un Poco Loco → Goliath - Transformed Warrior\n",
    );
  });

  it('refuses, writing nothing, when the file changed on the branch since the page read it', async () => {
    baseFile = featuredFileText([SIX[0], GOLIATH, ...SIX.slice(2)]);
    const calls = stubGithub();
    const message = await commitFeatured({token: 'tok', entries: PICKED, loaded: LOADED, changes: []}).then(
      () => 'saved',
      (e: Error) => e.message,
    );
    expect(message).toContain('featuredCardIds.json changed on master since this page read it');
    expect(featuredFailureKind(message)).toBe('stale');
    expect(calls.some((c) => c.url.endsWith('/git/blobs'))).toBe(false);
  });

  it('is refused by commitFiles when it changes nothing', async () => {
    baseFile = featuredFileText();
    builtTree = 'tree1';
    const calls = stubGithub();
    await expect(commitFeatured({token: 'tok', entries: LOADED, loaded: LOADED, changes: []})).rejects.toThrow('Nothing changed on master');
    expect(calls.some((c) => c.url.endsWith('/git/commits'))).toBe(false);
  });
});

describe('featuredCommitMessage', () => {
  it('lists one line per changed slot under the subject', () => {
    const changes = changedSlots(LOADED, entriesFor([GOLIATH, ...SIX.slice(1, 5), SIX[0]]));
    expect(featuredCommitMessage(changes).split('\n').slice(2, 4)).toEqual([
      'Amber: Miguel Rivera - Street Musician → Goliath - Transformed Warrior',
      'Steel: Tiana - Party Hostess → Miguel Rivera - Street Musician',
    ]);
  });
});
