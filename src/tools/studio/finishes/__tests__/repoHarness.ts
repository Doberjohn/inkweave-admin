import {vi, type Mock} from 'vitest';
import {base64ToUtf8} from '../../../../test/base64';
import {askedOf, contentsAnswer, type Asked, type Served} from './branchHarness';

/*
 * The app's repo as GitHub's API answers a publish (`commitFiles`): the target branch's files, which
 * a publish reads at the commit it builds on, and the git data calls that make its commit and move
 * the branch to it. Like branchHarness, it stubs fetch rather than vi.mock githubCommit:
 * src/test/setup.ts loads the batch store, and githubCommit with it, before a test file's vi.mock
 * registers, so the mock would never reach the publish and it would go out to api.github.com.
 */

/** The commit the branch is at: a publish builds on it, and reads the files there. */
export const BASE = 'base';

/** The tree the commit `BASE` points at. */
export const BASE_TREE = 'base-tree';

/** The tree a publish builds, unless a test says it is `BASE_TREE`. */
const NEW_TREE = 'tree';

/** The commit a publish makes, as GitHub links it. */
export const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/published';

/** Where the API keeps the app's repo: what a call's route follows. */
const REPO = '/repos/Doberjohn/inkweave/';

/** GitHub's answer to a ref update that moves the branch to the new commit. */
export const moved = (): Response => new Response('{}');

/** GitHub's answer to a ref update after someone else moved the branch: commitFiles' race. */
export const notAFastForward = (): Response =>
  new Response(JSON.stringify({message: 'Update is not a fast forward'}), {status: 422});

/** What the git data calls send: a blob's content, a tree's entries, a commit's message. */
interface GitBody {
  content?: string;
  tree?: {path: string; sha: string}[];
  message?: string;
}

/** A request the stub answered, with its method, its route in the repo ("git/blobs") and its body. */
interface Call {
  request: Parameters<typeof fetch>;
  method: string;
  route: string;
  body: GitBody;
}

/** How the stub answers a call, knowing every call so far, this one included. */
type Answer = (call: Call, calls: readonly Call[]) => Response | Promise<Response>;

/** Which calls a route answers, and how. */
type Route = [answers: (call: Call) => boolean, answer: Answer];

function callOf(request: Parameters<typeof fetch>): Call {
  const [url, init] = request;
  return {
    request,
    method: init?.method ?? 'GET',
    route: new URL(String(url)).pathname.slice(REPO.length),
    body: typeof init?.body === 'string' ? (JSON.parse(init.body) as GitBody) : {},
  };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status});

const isRead = ({route}: Call) => route.startsWith('contents/');
const isBlob = ({route}: Call) => route === 'git/blobs';
const isTree = ({route}: Call) => route === 'git/trees';
const isCommit = ({route}: Call) => route === 'git/commits';

/** What the stub is asked to hold, and how it answers the ref update. */
export interface RepoAnswers {
  /** The branch's files at its commit: each one's text, or the answer itself (a failure, or a read that waits). */
  files: Readonly<Record<string, Served>>;
  /** How GitHub answers the ref update: by default it moves the branch (`moved`). */
  update?: () => Response | Promise<Response>;
  /**
   * The sha GitHub gives the tree a publish builds: by default a new one. GitHub names a tree by what it
   * holds, so files that change nothing build the base commit's tree again: a test says so with `BASE_TREE`.
   */
  tree?: string;
}

/**
 * The contents API, answering only reads at the base: a publish reads what it writes over there, so
 * a read anywhere else fails the test it happens in.
 */
function atBaseOnly(contents: ReturnType<typeof contentsAnswer>): Answer {
  return ({request}) => {
    const {path, ref} = askedOf(request);
    if (ref !== BASE) throw new Error(`${path} was read at ${ref}, not at the commit the publish builds on`);
    return contents(...request);
  };
}

/** The routes of a publish, in the order commitFiles calls them. Each blob is named by its place among the blobs. */
function routesOf({files, update, tree}: Required<RepoAnswers>): Route[] {
  return [
    [isRead, atBaseOnly(contentsAnswer(files))],
    [({method, route}) => method === 'GET' && route.startsWith('git/ref/heads/'), () => json({object: {sha: BASE}})],
    [({route}) => route === `git/commits/${BASE}`, () => json({tree: {sha: BASE_TREE}})],
    [isBlob, (_call, calls) => json({sha: `blob-${calls.filter(isBlob).length - 1}`}, 201)],
    [isTree, () => json({sha: tree}, 201)],
    [isCommit, () => json({sha: 'published', html_url: COMMIT_URL}, 201)],
    [({method}) => method === 'PATCH', () => update()],
  ];
}

/** What the commit wrote: each path its tree names, with the content of the blob it names as it was sent (base64), in the tree's order. */
function blobsOf(calls: readonly Call[]): Record<string, string> {
  const blobs = calls.filter(isBlob).map(({body}) => body.content ?? '');
  const tree = calls.find(isTree)?.body.tree ?? [];
  return Object.fromEntries(tree.map(({path, sha}) => [path, blobs[Number(sha.replace('blob-', ''))]]));
}

/** What the commit wrote: each path its tree names, with the text of the blob it names, in the tree's order. */
function filesOf(calls: readonly Call[]): Record<string, string> {
  return Object.fromEntries(Object.entries(blobsOf(calls)).map(([path, content]) => [path, base64ToUtf8(content)]));
}

/** The stubbed API. */
export interface RepoStub {
  /** The stubbed fetch, for a test to answer one request its own way (`mockImplementationOnce`). */
  fetch: Mock<typeof fetch>;
  /** Each read of a file, in order: its path, the ref it was read at and the token it was read with. */
  reads: () => Asked[];
  /** Each call that writes (the blobs, the tree, the commit, the ref update) as "METHOD route", in order: none when nothing was written. */
  writes: () => string[];
  /** What the commit wrote: each file's path, and its text. */
  filesSent: () => Record<string, string>;
  /** What the commit wrote: each file's path, and its blob's content as it was sent, in base64: the bytes of a scan. */
  base64Sent: () => Record<string, string>;
  /** The commit's message, or undefined when no commit was made. */
  commitMessage: () => string | undefined;
}

/**
 * Stubs fetch as GitHub's API for a branch at `BASE` that holds `files`, which it serves only at
 * `BASE`. Unstub in afterEach (`vi.unstubAllGlobals`).
 */
export function stubRepo({files, update = moved, tree = NEW_TREE}: RepoAnswers): RepoStub {
  const routes = routesOf({files, update, tree});
  const calls: Call[] = [];
  const answer = vi.fn<typeof fetch>(async (...request) => {
    const call = callOf(request);
    calls.push(call);
    const route = routes.find(([answers]) => answers(call));
    if (!route) throw new Error(`nothing answers ${call.method} ${call.route}`);
    return route[1](call, calls);
  });
  vi.stubGlobal('fetch', answer);
  return {
    fetch: answer,
    reads: () => calls.filter(isRead).map(({request}) => askedOf(request)),
    writes: () => calls.filter(({method}) => method !== 'GET').map(({method, route}) => `${method} ${route}`),
    filesSent: () => filesOf(calls),
    base64Sent: () => blobsOf(calls),
    commitMessage: () => calls.find(isCommit)?.body.message,
  };
}
