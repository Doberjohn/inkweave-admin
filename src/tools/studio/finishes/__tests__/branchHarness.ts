import {vi, type Mock} from 'vitest';

/*
 * The target branch's files, as GitHub's contents API answers a read of them (`readRepoFile`). The
 * tests of what reads them stub fetch rather than vi.mock githubCommit: src/test/setup.ts loads
 * branchFiles, and githubCommit with it, before a test file's vi.mock registers, so the mock would
 * never reach the module under test and a read would go out to api.github.com.
 */

/** Where the contents API keeps a path of the app's repo, which `readRepoFile` reads it at. */
const CONTENTS = '/repos/Doberjohn/inkweave/contents/';

/** What a contents request asks for: the path and the ref in its address, and the token in its headers. */
interface Asked {
  path: string;
  ref: string;
  token: string;
}

function askedOf([url, init]: Parameters<typeof fetch>): Asked {
  const {pathname, searchParams} = new URL(String(url));
  const {Authorization = ''} = (init?.headers ?? {}) as Record<string, string>;
  return {
    path: pathname.slice(CONTENTS.length),
    ref: searchParams.get('ref') ?? '',
    token: Authorization.replace('Bearer ', ''),
  };
}

/** What the branch answers a path with: the file's text, or the answer itself (a failure, or a read that waits). */
export type Served = string | (() => Response | Promise<Response>);

/** The stubbed contents API. */
export interface BranchStub {
  /** The stubbed fetch, for a test to answer one request its own way (`mockImplementationOnce`). */
  fetch: Mock<typeof fetch>;
  /** The path each request asked for, in order. */
  paths: () => string[];
  /** The branch each request asked for, in order. */
  refs: () => string[];
  /** The token each request was made with, in order. */
  tokens: () => string[];
}

/**
 * Stubs fetch as the contents API of a branch that holds `files`, which it looks up on every
 * request, so a test can change one between reads. A path it doesn't hold is a 404. Unstub in
 * afterEach (`vi.unstubAllGlobals`).
 */
export function stubBranch(files: Readonly<Record<string, Served>>): BranchStub {
  const answer = vi.fn<typeof fetch>(async (...call) => {
    const served = files[askedOf(call).path];
    if (served === undefined) return new Response('Not Found', {status: 404});
    return typeof served === 'string' ? new Response(served) : served();
  });
  vi.stubGlobal('fetch', answer);
  const requests = () => answer.mock.calls.map(askedOf);
  return {
    fetch: answer,
    paths: () => requests().map(({path}) => path),
    refs: () => requests().map(({ref}) => ref),
    tokens: () => requests().map(({token}) => token),
  };
}

/** A read that finishes when the test says so. */
export function deferredResponse() {
  let respond: (response: Response) => void = () => {};
  const response = new Promise<Response>((resolve) => {
    respond = resolve;
  });
  return {response, respond};
}
