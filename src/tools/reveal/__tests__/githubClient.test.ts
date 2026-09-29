import {describe, it, expect, vi, afterEach} from 'vitest';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {base64ToUtf8} from '../../../test/base64';
import {commitNewCard} from '../githubClient';

afterEach(() => vi.restoreAllMocks());

const PREVIEW = '{\n  "metadata": {"language": "en"},\n  "cards": [\n    {\n      "id": 14001,\n      "name": "First"\n    }\n  ]\n}\n';

// Table-driven GitHub stub: [url matcher, response body]. Branch-free, for the complexity gate.
const ROUTES: [(url: string) => boolean, string][] = [
  [(u) => u.includes('/contents/'), PREVIEW],
  [(u) => u.endsWith('/git/ref/heads/master'), JSON.stringify({object: {sha: 'base1'}})],
  [(u) => u.includes('/git/commits/base1'), JSON.stringify({tree: {sha: 'tree1'}})],
  [(u) => u.endsWith('/git/blobs'), JSON.stringify({sha: 'blob1'})],
  [(u) => u.endsWith('/git/trees'), JSON.stringify({sha: 'tree2'})],
  [(u) => u.endsWith('/git/commits'), JSON.stringify({sha: 'commit2', html_url: 'https://github.com/x/y/commit/commit2'})],
  [(u) => u.endsWith('/git/refs/heads/master'), '{}'],
];

function stubGitHub() {
  const calls: {url: string; body?: {content?: string}}[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
    calls.push({url: String(url), body: init?.body ? JSON.parse(init.body as string) : undefined});
    const route = ROUTES.find(([match]) => match(String(url)));
    if (!route) throw new Error(`unexpected url ${String(url)}`);
    return new Response(route[1]);
  });
  return calls;
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
