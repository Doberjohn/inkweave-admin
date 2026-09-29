import {describe, it, expect, vi, afterEach} from 'vitest';
import {validateToken, utf8ToBase64, base64ToUtf8, commitFiles, readRepoFile, targetBranch} from './githubCommit';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('utf8 base64 round-trip', () => {
  it('survives the ink glyph', () => {
    const s = 'pay 1 ⬡ less to play this character.';
    expect(base64ToUtf8(utf8ToBase64(s))).toBe(s);
  });
});

describe('validateToken', () => {
  it('reports push access on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({permissions: {push: true}}), {status: 200}),
    );
    expect(await validateToken('tok')).toEqual({ok: true, canPush: true, error: undefined});
  });

  it('flags a token without push access', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({permissions: {push: false}}), {status: 200}),
    );
    const r = await validateToken('tok');
    expect(r.canPush).toBe(false);
    expect(r.error).toMatch(/write/i);
  });

  it('asks GitHub, not the browser cache', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({permissions: {push: true}}), {status: 200}),
    );
    await validateToken('tok');
    expect(fetchMock.mock.calls[0][1]?.cache).toBe('no-store');
  });
});

describe('targetBranch', () => {
  it('defaults to master', () => {
    expect(targetBranch()).toBe('master');
  });

  it('follows VITE_ADMIN_TARGET_BRANCH', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(targetBranch()).toBe('admin-verify');
  });
});

describe('readRepoFile', () => {
  it('reads the raw file from the target branch', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"text":"⬡"}'));

    expect(await readRepoFile('tok', 'apps/web/public/data/previewCards.json')).toBe('{"text":"⬡"}');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      'https://api.github.com/repos/Doberjohn/inkweave/contents/apps/web/public/data/previewCards.json?ref=admin-verify',
    );
    expect(new Headers(init?.headers).get('Accept')).toBe('application/vnd.github.raw+json');
    expect(init?.cache).toBe('no-store');
  });

  it('throws with the status when the read fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Not Found', {status: 404}));
    await expect(readRepoFile('tok', 'missing.json')).rejects.toThrow(/GitHub 404/);
  });
});

// Table-driven git-data API stub: [url matcher, JSON body, status]. Keeps the
// fetch mock branch-free (avoids the "complex method" gate on the test).
function gitRoutes(branch: string): [(u: string) => boolean, unknown, number][] {
  return [
    [(u) => u.endsWith(`/git/ref/heads/${branch}`), {object: {sha: 'basecommit'}}, 200],
    [(u) => u.includes('/git/commits/basecommit'), {tree: {sha: 'basetree'}}, 200],
    [(u) => u.endsWith('/git/blobs'), {sha: 'blobsha'}, 201],
    [(u) => u.endsWith('/git/trees'), {sha: 'newtree'}, 201],
    [(u) => u.endsWith('/git/commits'), {sha: 'newcommit', html_url: 'https://github.com/x/y/commit/newcommit'}, 201],
    [(u) => u.endsWith(`/git/refs/heads/${branch}`), {}, 200],
  ];
}

function gitStub(url: string, branch = 'master'): Response {
  const route = gitRoutes(branch).find(([match]) => match(url));
  if (!route) throw new Error(`unexpected url ${url}`);
  return new Response(JSON.stringify(route[1]), {status: route[2]});
}

describe('commitFiles', () => {
  it('creates a blob + tree per file and patches the ref', async () => {
    const calls: {url: string; method: string; body?: unknown}[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      const u = String(url);
      calls.push({url: u, method: init?.method ?? 'GET', body: init?.body ? JSON.parse(init.body as string) : undefined});
      return gitStub(u);
    });

    const res = await commitFiles({
      token: 'tok',
      message: 'test commit',
      files: [{path: 'a/b.txt', contentBase64: 'Zm9v'}],
    });

    expect(res.commitUrl).toBe('https://github.com/x/y/commit/newcommit');
    const tree = calls.find((c) => c.url.endsWith('/git/trees'))!;
    expect(tree.body).toMatchObject({base_tree: 'basetree', tree: [{path: 'a/b.txt', mode: '100644', type: 'blob', sha: 'blobsha'}]});
    const patch = calls.find((c) => c.url.endsWith('/git/refs/heads/master'))!;
    expect(patch.method).toBe('PATCH');
    expect(patch.body).toMatchObject({sha: 'newcommit'});
  });

  it('commits to the target branch and leaves master alone', async () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    const calls: string[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      calls.push(`${init?.method ?? 'GET'} ${String(url)}`);
      return gitStub(String(url), 'admin-verify');
    });

    await commitFiles({token: 'tok', message: 'rehearsal', files: [{path: 'a.txt', contentBase64: 'Zm9v'}]});

    expect(calls).toContain('GET https://api.github.com/repos/Doberjohn/inkweave/git/ref/heads/admin-verify');
    expect(calls).toContain('PATCH https://api.github.com/repos/Doberjohn/inkweave/git/refs/heads/admin-verify');
    expect(calls.join('\n')).not.toContain('master');
  });

  // GitHub marks API responses cacheable for 60 s. A publish right after another
  // one read a cached branch tip, built on it, and its ref update failed as "not
  // a fast forward" (the P2 rehearsal).
  it('bypasses the browser cache, so a publish right after another builds on the new tip', async () => {
    const modes: (RequestCache | undefined)[] = [];
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      modes.push(init?.cache);
      return gitStub(String(url));
    });

    await commitFiles({token: 'tok', message: 'test commit', files: [{path: 'a.txt', contentBase64: 'Zm9v'}]});

    expect(modes).toEqual(Array(6).fill('no-store'));
  });
});
