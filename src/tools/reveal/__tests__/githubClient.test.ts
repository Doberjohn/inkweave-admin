import {describe, it, expect, vi, afterEach} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {base64ToUtf8} from '../../../test/base64';
import {commitCardEdit, commitNewCard, readPreviewCards, StaleCardError} from '../githubClient';

afterEach(() => vi.restoreAllMocks());

const PREVIEW = '{\n  "metadata": {"language": "en"},\n  "cards": [\n    {\n      "id": 14001,\n      "name": "First"\n    }\n  ]\n}\n';

// An edit refuses a file that doesn't round-trip through JSON.stringify(…, null, 2),
// as PREVIEW's one-line metadata doesn't, so the edit cases get a file that does.
const EDIT_CARD: LorcanaJSONCard = {
  id: 14001,
  name: 'First',
  fullName: 'First',
  cost: 1,
  color: 'Amber',
  inkwell: true,
  type: 'Action',
  setCode: '14',
  number: 1,
};
const EDIT_PREVIEW = `${JSON.stringify({metadata: {language: 'en'}, cards: [EDIT_CARD, {...EDIT_CARD, id: 14002}]}, null, 2)}\n`;

// Table-driven GitHub stub: [url matcher, response body]. Branch-free, for the complexity gate.
function routes(preview: string): [(url: string) => boolean, string][] {
  return [
    [(u) => u.includes('/contents/'), preview],
    [(u) => u.endsWith('/git/ref/heads/master'), JSON.stringify({object: {sha: 'base1'}})],
    [(u) => u.includes('/git/commits/base1'), JSON.stringify({tree: {sha: 'tree1'}})],
    [(u) => u.endsWith('/git/blobs'), JSON.stringify({sha: 'blob1'})],
    [(u) => u.endsWith('/git/trees'), JSON.stringify({sha: 'tree2'})],
    [(u) => u.endsWith('/git/commits'), JSON.stringify({sha: 'commit2', html_url: 'https://github.com/x/y/commit/commit2'})],
    [(u) => u.endsWith('/git/refs/heads/master'), '{}'],
  ];
}

function stubGitHub(preview = PREVIEW) {
  const table = routes(preview);
  const calls: {url: string; body?: {content?: string; message?: string}}[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    calls.push({url: String(url), body: init?.body ? JSON.parse(init.body as string) : undefined});
    const route = table.find(([match]) => match(String(url)));
    if (!route) throw new Error(`unexpected url ${String(url)}`);
    return new Response(route[1]);
  });
  return calls;
}

type Calls = ReturnType<typeof stubGitHub>;
const blobs = (calls: Calls) => calls.filter((c) => c.url.endsWith('/git/blobs'));
const commitMessage = (calls: Calls) => calls.find((c) => c.url.endsWith('/git/commits'))?.body?.message;
const cardsIn = (blob: Calls[number]) =>
  (JSON.parse(base64ToUtf8(blob.body?.content ?? '')) as {cards: LorcanaJSONCard[]}).cards;

const card = (id: number): LorcanaJSONCard => ({id, name: 'Test', fullName: 'Test', cost: 1, color: 'Amber', inkwell: true, type: 'Action'});

describe('commitNewCard', () => {
  it('adds the card to previewCards.json as it is at the commit it builds on', async () => {
    const calls = stubGitHub();
    await commitNewCard({token: 'tok', card: card(14099), imageBase64: 'data:image/png;base64,Zm9v', imageExt: 'png'});

    expect(calls.find((c) => c.url.includes('/contents/'))?.url).toContain('?ref=base1');
    const [preview, image] = blobs(calls);
    expect(cardsIn(preview).map((c) => c.id)).toEqual([14001, 14099]);
    expect(image.body?.content).toBe('Zm9v');
  });

  it("refuses an id that is already in that commit's previewCards.json", async () => {
    const calls = stubGitHub();
    await expect(
      commitNewCard({token: 'tok', card: card(14001), imageBase64: 'Zm9v', imageExt: 'png'}),
    ).rejects.toThrow('Card id 14001 already exists in previewCards.json');
    expect(blobs(calls)).toHaveLength(0);
  });

  it('writes nothing when previewCards.json cannot be read', async () => {
    const urls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      urls.push(String(url));
      return String(url).includes('/contents/')
        ? new Response('Not Found', {status: 404})
        : new Response(JSON.stringify({object: {sha: 'base1'}}));
    });
    await expect(
      commitNewCard({token: 'tok', card: card(14099), imageBase64: 'Zm9v', imageExt: 'png'}),
    ).rejects.toThrow(/GitHub 404/);
    expect(urls.some((u) => u.endsWith('/git/blobs'))).toBe(false);
  });
});

describe('commitCardEdit', () => {
  const RENAME = {name: 'Renamed', fullName: 'Renamed'};

  it('commits the edited card and its image together, read at the commit it builds on', async () => {
    const calls = stubGitHub(EDIT_PREVIEW);
    await commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: RENAME, image: {base64: 'data:image/png;base64,Zm9v', ext: 'png'}});

    expect(calls.find((c) => c.url.includes('/contents/'))?.url).toContain('?ref=base1');
    const [preview, image] = blobs(calls);
    expect(cardsIn(preview).map((c) => [c.id, c.name])).toEqual([
      [14001, 'Renamed'],
      [14002, 'First'],
    ]);
    expect(image.body?.content).toBe('Zm9v');
    expect(calls.filter((c) => c.url.endsWith('/git/refs/heads/master'))).toHaveLength(1);
    expect(commitMessage(calls)).toBe('fix(reveals): update Renamed (141)');
  });

  it('commits previewCards.json alone when no image is staged', async () => {
    const calls = stubGitHub(EDIT_PREVIEW);
    await commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: RENAME, image: null});
    expect(blobs(calls)).toHaveLength(1);
  });

  it.each([
    {reason: 'changed on the branch', loaded: {...EDIT_CARD, cost: 2}, message: /changed on master since you loaded it/},
    {reason: 'gone from the file', loaded: {...EDIT_CARD, id: 14005}, message: /no longer in previewCards\.json on master/},
  ])('refuses a card $reason since it loaded, and writes nothing', async ({loaded, message}) => {
    const calls = stubGitHub(EDIT_PREVIEW);
    const save = commitCardEdit({token: 'tok', loaded, changes: RENAME, image: null});
    await expect(save).rejects.toThrow(message);
    await expect(save).rejects.toBeInstanceOf(StaleCardError);
    expect(blobs(calls)).toHaveLength(0);
  });
});

describe('readPreviewCards', () => {
  it('reads the cards from the target branch', async () => {
    const calls = stubGitHub(EDIT_PREVIEW);
    const cards = await readPreviewCards('tok');
    expect(cards.map((c) => c.id)).toEqual([14001, 14002]);
    expect(calls[0].url).toContain('?ref=master');
  });

  it('refuses a file with no cards array', async () => {
    stubGitHub('{"metadata": {}}');
    await expect(readPreviewCards('tok')).rejects.toThrow(/no cards array/);
  });
});
