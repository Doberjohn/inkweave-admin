import {describe, it, expect, vi, afterEach} from 'vitest';
import {commitCardImage} from '../githubClient';

afterEach(() => vi.restoreAllMocks());

// Table-driven git-data API stub: [url matcher, JSON body, status]. Keeps the
// fetch mock branch-free (avoids the "complex method" gate on the test).
const GIT_ROUTES: [(u: string) => boolean, unknown, number][] = [
  [(u) => u.endsWith('/git/ref/heads/master'), {object: {sha: 'c0'}}, 200],
  [(u) => u.includes('/git/commits/c0'), {tree: {sha: 't0'}}, 200],
  [(u) => u.endsWith('/git/blobs'), {sha: 'b0'}, 201],
  [(u) => u.endsWith('/git/trees'), {sha: 't1'}, 201],
  [(u) => u.endsWith('/git/commits'), {sha: 'c1', html_url: 'https://gh/commit/c1'}, 201],
  [(u) => u.endsWith('/git/refs/heads/master'), {}, 200],
];

function gitStub(url: string): Response {
  const route = GIT_ROUTES.find(([match]) => match(url));
  if (!route) throw new Error(`unexpected ${url}`);
  return new Response(JSON.stringify(route[1]), {status: route[2]});
}

/** Stubs the git-data API, and returns the URLs it is asked for. */
function stubGitUrls(): string[] {
  const urls: string[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
    urls.push(String(url));
    return gitStub(String(url));
  });
  return urls;
}

describe('commitCardImage', () => {
  it('commits one raw file to card-images-raw and no previewCards path', async () => {
    const bodies: unknown[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      if (init?.body) bodies.push(JSON.parse(init.body as string));
      return gitStub(String(url));
    });

    const res = await commitCardImage({
      token: 'tok',
      card: {id: '5001', fullName: 'Elsa - Snow Queen'},
      imageBase64: 'data:image/png;base64,Zm9v',
      imageExt: 'png',
    });

    expect(res.commitUrl).toBe('https://gh/commit/c1');
    // The trees POST is the body whose `tree` is a list; the commit POST names a tree sha.
    const tree = bodies.find((b) => Array.isArray((b as {tree?: unknown}).tree)) as {tree: {path: string}[]};
    expect(tree.tree).toHaveLength(1);
    expect(tree.tree[0].path).toBe('apps/web/public/card-images-raw/5001.png');
    expect(JSON.stringify(bodies)).not.toContain('previewCards.json');
  });

  // Card studio's check for a card under a preview id builds on this (commitPreviewCardImage, R4-8a).
  describe('with atBase', () => {
    const SCAN = {token: 'tok', card: {id: '5001', fullName: 'Elsa - Snow Queen'}, imageBase64: 'data:image/png;base64,Zm9v', imageExt: 'png'};
    const RAW = {path: 'apps/web/public/card-images-raw/5001.png', contentBase64: 'Zm9v'};

    it('hands it the raw scan, and commits the files its callback returns at the base commit', async () => {
      const urls = stubGitUrls();
      const seen: unknown[] = [];
      const res = await commitCardImage({
        ...SCAN,
        atBase: (raw) => async (baseCommitSha) => {
          seen.push({raw, baseCommitSha});
          return [raw];
        },
      });

      expect(seen).toEqual([{raw: RAW, baseCommitSha: 'c0'}]);
      expect(res.commitUrl).toBe('https://gh/commit/c1');
      expect(urls.some((url) => url.endsWith('/git/refs/heads/master'))).toBe(true);
    });

    it('writes nothing when the callback refuses', async () => {
      const urls = stubGitUrls();
      const refusal = new Error('refused at the base');
      await expect(commitCardImage({...SCAN, atBase: () => () => Promise.reject(refusal)})).rejects.toBe(refusal);
      expect(urls.some((url) => url.endsWith('/git/blobs'))).toBe(false);
    });
  });
});
