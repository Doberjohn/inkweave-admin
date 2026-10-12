import {describe, it, expect, vi, afterEach} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {base64ToUtf8} from '../../../test/base64';
import {commitCardEdit, commitNewCard, readPreviewCards, StaleCardError} from '../githubClient';

afterEach(() => vi.restoreAllMocks());

const PREVIEW = '{\n  "metadata": {"language": "en"},\n  "cards": [\n    {\n      "id": 14001,\n      "name": "First"\n    }\n  ]\n}\n';

/** What the stubbed branch holds. */
interface StubFiles {
  /** previewCards.json's text. */
  preview?: string;
  /** The status its read answers: 404 for a missing file, 401 for a rejected token. */
  previewStatus?: number;
}

/** One request the stub answered, with its JSON body. */
interface Call {
  url: string;
  body?: {content?: string; message?: string; tree?: {path: string}[]};
}

// Table-driven GitHub stub: [url matcher, response body, status]. Branch-free, for the complexity gate.
function routes({preview = PREVIEW, previewStatus = 200}: StubFiles): [(url: string) => boolean, string, number][] {
  return [
    [(u) => u.includes('/contents/'), preview, previewStatus],
    [(u) => u.endsWith('/git/ref/heads/master'), JSON.stringify({object: {sha: 'base1'}}), 200],
    [(u) => u.includes('/git/commits/base1'), JSON.stringify({tree: {sha: 'tree1'}}), 200],
    [(u) => u.endsWith('/git/blobs'), JSON.stringify({sha: 'blob1'}), 200],
    [(u) => u.endsWith('/git/trees'), JSON.stringify({sha: 'tree2'}), 200],
    [(u) => u.endsWith('/git/commits'), JSON.stringify({sha: 'commit2', html_url: 'https://github.com/x/y/commit/commit2'}), 200],
    [(u) => u.endsWith('/git/refs/heads/master'), '{}', 200],
  ];
}

function stubGitHub(files: StubFiles = {}): Call[] {
  const table = routes(files);
  const calls: Call[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    calls.push({url: String(url), body: init?.body ? JSON.parse(init.body as string) : undefined});
    const route = table.find(([match]) => match(String(url)));
    if (!route) throw new Error(`unexpected url ${String(url)}`);
    return new Response(route[1], {status: route[2]});
  });
  return calls;
}

/** The refs previewCards.json was read at. */
function readsOf(calls: Call[]): string[] {
  return calls.filter((c) => c.url.includes('/contents/')).map((c) => new URL(c.url).searchParams.get('ref') ?? '');
}

/** What the commit wrote: its tree's paths, each blob as text, its message, and how many ref updates it made. */
function commitOf(calls: Call[]) {
  return {
    paths: calls.find((c) => c.url.endsWith('/git/trees'))?.body?.tree?.map((entry) => entry.path),
    blobs: calls.filter((c) => c.url.endsWith('/git/blobs')).map((c) => base64ToUtf8(c.body?.content ?? '')),
    message: calls.find((c) => c.url.endsWith('/git/commits'))?.body?.message,
    refUpdates: calls.filter((c) => c.url.endsWith('/git/refs/heads/master')).length,
  };
}

function wroteNothing(calls: Call[]): boolean {
  return !calls.some((c) => c.url.endsWith('/git/blobs'));
}

const card = (id: number): LorcanaJSONCard => ({id, name: 'Test', fullName: 'Test', cost: 1, color: 'Amber', inkwell: true, type: 'Action'});

describe('commitNewCard', () => {
  it('adds the card to previewCards.json as it is at the commit it builds on', async () => {
    const calls = stubGitHub();
    await commitNewCard({token: 'tok', card: card(14099), imageBase64: 'data:image/png;base64,Zm9v', imageExt: 'png'});

    expect(calls.find((c) => c.url.includes('/contents/'))?.url).toContain('?ref=base1');
    const [preview, image] = calls.filter((c) => c.url.endsWith('/git/blobs'));
    const ids = (JSON.parse(base64ToUtf8(preview.body?.content ?? '')) as {cards: {id: number}[]}).cards.map((c) => c.id);
    expect(ids).toEqual([14001, 14099]);
    expect(image.body?.content).toBe('Zm9v');
  });

  it("refuses an id that is already in that commit's previewCards.json", async () => {
    const calls = stubGitHub();
    await expect(
      commitNewCard({token: 'tok', card: card(14001), imageBase64: 'Zm9v', imageExt: 'png'}),
    ).rejects.toThrow('Card id 14001 already exists in previewCards.json');
    expect(calls.some((c) => c.url.endsWith('/git/blobs'))).toBe(false);
  });
});

// An edit refuses a file that doesn't round-trip through JSON.stringify(…, null, 2) + '\n'
// (R4-1a), as PREVIEW's one-line metadata doesn't, so the edit cases get files that do.
function previewFile(cards: LorcanaJSONCard[]): string {
  return JSON.stringify({metadata: {language: 'en'}, cards}, null, 2) + '\n';
}

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
const NEIGHBOUR: LorcanaJSONCard = {...EDIT_CARD, id: 14002, name: 'Second', fullName: 'Second', number: 2};
const EDIT_PREVIEW = previewFile([EDIT_CARD, NEIGHBOUR]);
const RENAME = {name: 'Renamed', fullName: 'Renamed'};
const IMAGE = {dataUrl: 'data:image/png;base64,Zm9v', ext: 'png'};
const PREVIEW_JSON = 'apps/web/public/data/previewCards.json';
const RAW_SCAN = 'apps/web/public/card-images-raw/14001.png';

describe('commitCardEdit', () => {
  it('edits previewCards.json as it is at the commit it builds on, with the scan, in one commit', async () => {
    const calls = stubGitHub({preview: EDIT_PREVIEW});
    const result = await commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: RENAME, image: IMAGE});

    expect(readsOf(calls)).toEqual(['base1']);
    expect(commitOf(calls)).toEqual({
      paths: [PREVIEW_JSON, RAW_SCAN],
      blobs: [previewFile([{...EDIT_CARD, ...RENAME}, NEIGHBOUR]), 'foo'],
      message: 'fix(reveals): update Renamed (141) and its image',
      refUpdates: 1,
    });
    expect(result).toEqual({commitUrl: 'https://github.com/x/y/commit/commit2'});
  });

  it.each([
    {
      name: 'a field edit alone',
      loaded: EDIT_CARD,
      changes: RENAME,
      image: null,
      paths: [PREVIEW_JSON],
      message: 'fix(reveals): update Renamed (141)',
    },
    {
      // admin#14: the English scan, with the card's English name.
      name: 'a refresh to the English scan',
      loaded: {...EDIT_CARD, scanLanguage: 'ja'},
      changes: {...RENAME, scanLanguage: null},
      image: IMAGE,
      paths: [PREVIEW_JSON, RAW_SCAN],
      message: 'fix(reveals): refresh Renamed (141) to its English scan',
    },
    {
      // The mark alone, the English scan already in place: no image, and the name the card keeps.
      name: 'a refresh to the English scan alone',
      loaded: {...EDIT_CARD, scanLanguage: 'ja'},
      changes: {scanLanguage: null},
      image: null,
      paths: [PREVIEW_JSON],
      message: 'fix(reveals): refresh First (141) to its English scan',
    },
  ])('$name: its files and message (R-78)', async ({loaded, changes, image, paths, message}) => {
    const calls = stubGitHub({preview: previewFile([loaded, NEIGHBOUR])});
    await commitCardEdit({token: 'tok', loaded, changes, image});
    expect(commitOf(calls)).toMatchObject({paths, message, refUpdates: 1});
  });

  it('lands on a base whose entry gained variants since the load, and keeps them (R-67)', async () => {
    const base: LorcanaJSONCard = {...EDIT_CARD, variants: [{id: 14224, rarity: 'Enchanted', number: 224}]};
    const calls = stubGitHub({preview: previewFile([base, NEIGHBOUR])});
    await commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: {cost: 2}, image: null});
    expect(commitOf(calls).blobs).toEqual([previewFile([{...base, cost: 2}, NEIGHBOUR])]);
  });

  it.each([
    ['its cost changed', [{...EDIT_CARD, cost: 2}, NEIGHBOUR], 'Card 14001 changed on master since you loaded it. Load it again.'],
    ['its number changed', [{...EDIT_CARD, number: 3}, NEIGHBOUR], 'Card 14001 changed on master since you loaded it. Load it again.'],
    ['it left the file', [NEIGHBOUR], 'Card 14001 is no longer in previewCards.json on master. Load it again.'],
  ])('refuses with StaleCardError, writing nothing, when %s at the base (R-67)', async (_case, cards, message) => {
    const calls = stubGitHub({preview: previewFile(cards)});
    const error = await commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: RENAME, image: IMAGE}).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(StaleCardError);
    expect(error).toMatchObject({name: 'StaleCardError', message});
    expect(wroteNothing(calls)).toBe(true);
  });
});

describe('a write that cannot read previewCards.json', () => {
  it.each([
    ['commitNewCard', () => commitNewCard({token: 'tok', card: card(14099), imageBase64: 'Zm9v', imageExt: 'png'})],
    ['commitCardEdit', () => commitCardEdit({token: 'tok', loaded: EDIT_CARD, changes: RENAME, image: IMAGE})],
  ])('%s writes nothing', async (_writer, write) => {
    const calls = stubGitHub({previewStatus: 404});
    await expect(write()).rejects.toThrow(/^GitHub 404 on /);
    expect(wroteNothing(calls)).toBe(true);
  });
});

describe('readPreviewCards', () => {
  it('reads the cards on the target branch', async () => {
    const calls = stubGitHub({preview: EDIT_PREVIEW});
    // Fetched JSON: toEqual, never toStrictEqual (vite.config.ts, the app project).
    expect(await readPreviewCards('tok')).toEqual([EDIT_CARD, NEIGHBOUR]);
    expect(readsOf(calls)).toEqual(['master']);
  });

  it.each([
    ['a missing file', {previewStatus: 404}, /^GitHub 404 on /],
    // isRejectedToken reads this, so Edit can offer Forget token (R-26).
    ['a rejected token', {previewStatus: 401}, /^GitHub 401 on /],
    ['a file with no cards array', {preview: '{\n  "metadata": {}\n}\n'}, 'previewCards.json has no cards array'],
    ['a file that is not JSON', {preview: '<!doctype html>'}, 'previewCards.json is not valid JSON'],
  ])('refuses %s', async (_case, files, error) => {
    stubGitHub(files);
    await expect(readPreviewCards('tok')).rejects.toThrow(error);
  });
});
