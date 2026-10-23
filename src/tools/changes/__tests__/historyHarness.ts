import {vi, type Mock} from 'vitest';
import type {ChangedFile, CommitFiles, ListedCommit} from '../../../github/githubHistory';

/*
 * The app repo's history as GitHub's API answers the change history's reads: a path's
 * commit list a page at a time, one commit's files, and a file at a commit. Tests stub
 * fetch with it rather than vi.mock githubHistory, as the studio's harnesses do
 * (src/tools/studio/finishes/__tests__/branchHarness.ts).
 */

const REPO = '/repos/Doberjohn/inkweave';

/** A commit as a path's list gives it. `login` null is an author GitHub doesn't know. */
export function listed({
  sha,
  date,
  message,
  login = 'Doberjohn',
}: {
  sha: string;
  date: string;
  message: string;
  login?: string | null;
}): ListedCommit {
  return {
    sha,
    commit: {message, author: {name: login ?? 'Someone', date}, committer: {name: login ?? 'Someone', date}},
    author: login === null ? null : {login},
  };
}

/** A commit as GitHub gives it alone: its files, on top of `parent`. */
export function commitOf({sha, parent, files}: {sha: string; parent: string | null; files: ChangedFile[]}): CommitFiles {
  return {
    sha,
    html_url: `https://github.com/Doberjohn/inkweave/commit/${sha}`,
    parents: parent === null ? [] : [{sha: parent}],
    files,
  };
}

/** The repo the stub answers from. */
export interface FakeRepo {
  /** Each followed path's whole history, newest first: the stub pages it as GitHub does. */
  histories?: Readonly<Record<string, readonly ListedCommit[]>>;
  /** Each commit's files, by sha. */
  commits?: Readonly<Record<string, CommitFiles>>;
  /** Each file's text at a commit, keyed "<sha>:<path>". */
  files?: Readonly<Record<string, string>>;
}

const json = (body: unknown) => new Response(JSON.stringify(body), {headers: {'content-type': 'application/json'}});

/** A path's page: `per_page` commits from the `page`-th, as GitHub pages a list. */
function historyPage(repo: FakeRepo, params: URLSearchParams): Response {
  const history = repo.histories?.[params.get('path') ?? ''] ?? [];
  const size = Number(params.get('per_page'));
  const page = Number(params.get('page'));
  return json(history.slice((page - 1) * size, page * size));
}

/** What the fake answers one request with. Anything it doesn't hold is a 404, as GitHub's would be. */
function answer(repo: FakeRepo, url: URL): Response {
  const path = url.pathname.slice(REPO.length);
  if (path === '/commits') return historyPage(repo, url.searchParams);
  if (path.startsWith('/commits/')) {
    const commit = repo.commits?.[path.slice('/commits/'.length)];
    return commit ? json(commit) : new Response('Not Found', {status: 404});
  }
  const file = repo.files?.[`${url.searchParams.get('ref')}:${path.slice('/contents/'.length)}`];
  return file === undefined ? new Response('Not Found', {status: 404}) : new Response(file);
}

/** The stubbed API, and what each request asked for. */
export interface HistoryStub {
  fetch: Mock<typeof fetch>;
  /** Each request's path and query, after the repo's API root: "/commits?sha=master&…", "/contents/x?ref=abc". */
  asked: () => string[];
}

/** Stubs fetch as GitHub's API over `repo`. Unstub in afterEach (vi.unstubAllGlobals). */
export function stubHistory(repo: FakeRepo): HistoryStub {
  const stub = vi.fn<typeof fetch>(async (input) => answer(repo, new URL(String(input))));
  vi.stubGlobal('fetch', stub);
  return {
    fetch: stub,
    asked: () =>
      stub.mock.calls.map(([input]) => {
        const url = new URL(String(input));
        return `${url.pathname.slice(REPO.length)}${decodeURIComponent(url.search)}`;
      }),
  };
}
