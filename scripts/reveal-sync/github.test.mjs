// @vitest-environment node
import {afterEach, describe, expect, it} from 'vitest';
import {
  advanceBranch,
  branchExists,
  createBranch,
  createCommit,
  listDir,
  openPullRequest,
  openPullsFrom,
  readFile,
  readRaw,
  setGhRunner,
} from './github.mjs';
import {fakeGh, fileAnswer, ghError, rawAnswer, table} from './__fixtures__/gh.mjs';

afterEach(() => setGhRunner());

describe('github', () => {
  it('reads a file as text, with its blob sha', () => {
    fakeGh(table({'GET repos/o/r/contents/a/b.json?ref=master': fileAnswer('{"cards":[]}\n', 'abc')}));
    expect(readFile('o/r', 'a/b.json', 'master')).toEqual({text: '{"cards":[]}\n', sha: 'abc'});
  });

  it('refuses a file too large for the contents API', () => {
    fakeGh(() => ({content: '', encoding: 'none', sha: 'abc'}));
    expect(() => readFile('o/r', 'big.json', 'master')).toThrow(/1 MB/);
  });

  // GitHub answers a file over 1 MB with no content unless the call asks for the raw media type.
  it('reads a file over the 1 MB limit as its raw text', () => {
    const calls = fakeGh(({accept}) =>
      accept === 'application/vnd.github.raw'
        ? rawAnswer('{\n  "cards": []\n}\n')
        : {content: '', encoding: 'none', sha: 'abc'},
    );
    expect(readRaw('o/r', 'a/big.json', 'p1')).toBe('{\n  "cards": []\n}\n');
    expect(calls.map(({method, endpoint}) => `${method} ${endpoint}`)).toEqual([
      'GET repos/o/r/contents/a/big.json?ref=p1',
    ]);
  });

  it('lists a directory from its git tree, which has no 1,000-entry cap', () => {
    fakeGh(
      table({
        'GET repos/o/r/contents/a/b?ref=master': [
          {name: 'c', type: 'dir', sha: 'tree-c'},
          {name: 'c.json', type: 'file', sha: 'f'},
        ],
        'GET repos/o/r/git/trees/tree-c': {tree: [{path: '1.avif'}, {path: '1-sm.avif'}]},
      }),
    );
    expect(listDir('o/r', 'a/b/c', 'master')).toEqual(new Set(['1.avif', '1-sm.avif']));
  });

  it('commits on a parent: a blob per file, a tree on its tree, then the commit', () => {
    const calls = fakeGh(
      table({
        'GET repos/o/r/git/commits/p1': {tree: {sha: 't0'}},
        'POST repos/o/r/git/blobs': {sha: 'b1'},
        'POST repos/o/r/git/trees': {sha: 't1'},
        'POST repos/o/r/git/commits': {sha: 'c1'},
      }),
    );
    expect(createCommit('o/r', {parent: 'p1', message: 'm', files: [{path: 'a.json', base64: 'YQ=='}]})).toBe('c1');
    expect(calls[1].body).toEqual({content: 'YQ==', encoding: 'base64'});
    expect(calls[2].body).toEqual({base_tree: 't0', tree: [{path: 'a.json', mode: '100644', type: 'blob', sha: 'b1'}]});
    expect(calls[3].body).toEqual({message: 'm', tree: 't1', parents: ['p1']});
  });

  it('tells a missing branch from one that exists, and passes any other failure on', () => {
    fakeGh(
      table({
        'GET repos/o/r/git/ref/heads/reveals/a': {object: {sha: 's1'}},
        'GET repos/o/r/git/ref/heads/reveals/b': ghError('gh: Not Found (HTTP 404)\n'),
        'GET repos/o/r/git/ref/heads/reveals/c': ghError('gh: Bad credentials (HTTP 401)\n'),
      }),
    );
    expect(branchExists('o/r', 'reveals/a')).toBe(true);
    expect(branchExists('o/r', 'reveals/b')).toBe(false);
    expect(() => branchExists('o/r', 'reveals/c')).toThrow(/HTTP 401/);
  });

  it('creates branches and never forces an update', () => {
    const calls = fakeGh(() => ({}));
    createBranch('o/r', 'reveals/x', 's1');
    advanceBranch('o/r', 'main', 's2');
    expect(calls.map(({method, endpoint, body}) => [method, endpoint, body])).toEqual([
      ['POST', 'repos/o/r/git/refs', {ref: 'refs/heads/reveals/x', sha: 's1'}],
      ['PATCH', 'repos/o/r/git/refs/heads/main', {sha: 's2', force: false}],
    ]);
  });

  it('opens a PR, and finds open ones by branch prefix', () => {
    fakeGh(
      table({
        'POST repos/o/r/pulls': {html_url: 'https://github.com/o/r/pull/9'},
        'GET repos/o/r/pulls?state=open&per_page=100&page=1': [
          {number: 9, html_url: 'u9', head: {ref: 'reveals/set14-x'}},
          {number: 8, html_url: 'u8', head: {ref: 'feature/1-y'}},
        ],
      }),
    );
    expect(openPullRequest('o/r', {head: 'h', base: 'master', title: 't', body: 'b'})).toBe('https://github.com/o/r/pull/9');
    expect(openPullsFrom('o/r', 'reveals/')).toEqual([{number: 9, url: 'u9', branch: 'reveals/set14-x'}]);
  });

  it('reads every page of open PRs, so a reveal PR past the first 100 still counts', () => {
    const others = Array.from({length: 100}, (_, i) => ({number: i + 1, html_url: `u${i + 1}`, head: {ref: `feature/${i + 1}-x`}}));
    fakeGh(
      table({
        'GET repos/o/r/pulls?state=open&per_page=100&page=1': others,
        'GET repos/o/r/pulls?state=open&per_page=100&page=2': [{number: 101, html_url: 'u101', head: {ref: 'reveals/set14-y'}}],
      }),
    );
    expect(openPullsFrom('o/r', 'reveals/')).toEqual([{number: 101, url: 'u101', branch: 'reveals/set14-y'}]);
  });

  it("names the call and gh's own message when a call fails", () => {
    fakeGh(() => ghError('gh: Reference already exists (HTTP 422)\n'));
    expect(() => createBranch('o/r', 'reveals/x', 's1')).toThrow(
      'gh api POST repos/o/r/git/refs: gh: Reference already exists (HTTP 422)',
    );
  });
});
