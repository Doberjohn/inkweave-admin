// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {setGhRunner} from './github.mjs';
import {gitBlobSha, publishRun} from './publish.mjs';
import {outDir, readRun, stateFile, writeBase, writeRun} from './runstore.mjs';
import {fakeGh, fileAnswer, ghError, table} from './__fixtures__/gh.mjs';

const APP = 'repos/Doberjohn/inkweave';
const ADMIN = 'repos/Doberjohn/inkweave-admin';
const STATE = '{\n  "sets": {}\n}\n';
const STATE_SHA = gitBlobSha(Buffer.from(STATE));
const NEW_STATE = '{\n  "sets": {\n    "14": {}\n  }\n}\n';
const OPEN_PRS = `GET repos/Doberjohn/inkweave/pulls?state=open&per_page=100&page=1`;
const PR_URL = 'https://github.com/Doberjohn/inkweave/pull/800';
const BRANCH = 'reveals/set14-publish-test';

const ANSWERS = {
  [`GET ${APP}/git/ref/heads/master`]: {object: {sha: 'app-tip'}},
  [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=app-tip`]: fileAnswer('{}', 'preview-blob'),
  [`GET ${APP}/git/commits/app-tip`]: {tree: {sha: 'app-tree'}},
  [`POST ${APP}/git/blobs`]: {sha: 'blob'},
  [`POST ${APP}/git/trees`]: {sha: 'tree'},
  [`POST ${APP}/git/commits`]: {sha: 'app-commit'},
  [`POST ${APP}/git/refs`]: {ref: `refs/heads/${BRANCH}`},
  [OPEN_PRS]: [],
  [`POST ${APP}/pulls`]: {html_url: PR_URL},
  [`GET ${ADMIN}/git/ref/heads/main`]: {object: {sha: 'admin-tip'}},
  [`GET ${ADMIN}/contents/scripts/reveal-sync/state.json?ref=admin-tip`]: fileAnswer(STATE, STATE_SHA),
  [`GET ${ADMIN}/git/commits/admin-tip`]: {tree: {sha: 'admin-tree'}},
  [`POST ${ADMIN}/git/blobs`]: {sha: 'blob'},
  [`POST ${ADMIN}/git/trees`]: {sha: 'tree'},
  [`POST ${ADMIN}/git/commits`]: {sha: 'admin-commit'},
  [`PATCH ${ADMIN}/git/refs/heads/main`]: {object: {sha: 'admin-commit'}},
};

const github = (overrides = {}) => fakeGh(table({...ANSWERS, ...overrides}));
/** The calls that write, in order. */
const writes = (calls) => calls.filter(({method}) => method !== 'GET').map(({method, endpoint}) => `${method} ${endpoint}`);

/** A run `write` staged: one card, its two AVIFs, and a changed state. */
function stagedRun(overrides = {}) {
  const run = {
    runId: 'publish-test',
    today: '2026-10-01',
    season: {setCode: '14'},
    appBase: 'master',
    stateBranch: 'main',
    baseBlob: 'preview-blob',
    stateBlob: STATE_SHA,
    staged: true,
    cards: {'test-pup-tiny-troublemaker': {number: 40, id: 14040, title: 'Test Pup - Tiny Troublemaker', status: 'written'}},
    ...overrides,
  };
  writeBase(run.runId, {previewText: '{}', stateText: NEW_STATE});
  fs.mkdirSync(path.join(outDir(run.runId), 'avif'), {recursive: true});
  fs.writeFileSync(path.join(outDir(run.runId), 'previewCards.json'), '{"cards":[]}\n');
  for (const name of ['14040.avif', '14040-sm.avif']) fs.writeFileSync(path.join(outDir(run.runId), 'avif', name), name);
  writeRun(run);
  return run;
}

beforeEach(() => vi.stubEnv('REVEAL_SYNC_RUNS', fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-runs-'))));
afterEach(() => {
  vi.unstubAllEnvs();
  setGhRunner();
});

describe('publishRun', () => {
  it('opens the app PR from a reveals/ branch, then commits the state straight to main', () => {
    const calls = github();
    const run = stagedRun();
    expect(publishRun(run)).toEqual({url: PR_URL, stateCommit: 'admin-commit'});
    expect(writes(calls)).toEqual([
      `POST ${APP}/git/blobs`,
      `POST ${APP}/git/blobs`,
      `POST ${APP}/git/blobs`,
      `POST ${APP}/git/trees`,
      `POST ${APP}/git/commits`,
      `POST ${APP}/git/refs`,
      `POST ${APP}/pulls`,
      `POST ${ADMIN}/git/blobs`,
      `POST ${ADMIN}/git/trees`,
      `POST ${ADMIN}/git/commits`,
      `PATCH ${ADMIN}/git/refs/heads/main`,
    ]);
    const pr = calls.find(({endpoint}) => endpoint === `${APP}/pulls`).body;
    expect(pr).toMatchObject({head: BRANCH, base: 'master', title: 'Set 14 reveals: 1 card (2026-10-01)'});
    expect(pr.body).toMatch(/^- 14040 Test Pup - Tiny Troublemaker\n/);
    expect(calls.at(-1).body).toEqual({sha: 'admin-commit', force: false});
    expect(readRun(run.runId)).toMatchObject({
      published: {commit: 'app-commit', branch: BRANCH, url: PR_URL},
      stateCommit: 'admin-commit',
    });
  });

  it('resumes after the branch, with no second commit', () => {
    const calls = github();
    publishRun(stagedRun({published: {commit: 'app-commit', branch: BRANCH}}));
    expect(writes(calls)[0]).toBe(`POST ${APP}/pulls`);
  });

  it('takes a branch an interrupted attempt already made at the same commit', () => {
    github({
      [`POST ${APP}/git/refs`]: ghError('gh: Reference already exists (HTTP 422)'),
      [`GET ${APP}/git/ref/heads/${BRANCH}`]: {object: {sha: 'app-commit'}},
    });
    expect(publishRun(stagedRun()).url).toBe(PR_URL);
  });

  // The PR was opened, but the answer never arrived: GitHub would refuse a second one.
  it('takes a PR an interrupted attempt already opened', () => {
    const calls = github({[OPEN_PRS]: [{number: 800, html_url: PR_URL, head: {ref: BRANCH}}]});
    const run = stagedRun({published: {commit: 'app-commit', branch: BRANCH}});
    expect(publishRun(run).url).toBe(PR_URL);
    expect(writes(calls).some((call) => call.endsWith('/pulls'))).toBe(false);
  });

  // The branch moved, but the answer never arrived: the tip already holds this run's state.
  it('takes a state commit an interrupted attempt already made', () => {
    const calls = github({
      [`GET ${ADMIN}/contents/scripts/reveal-sync/state.json?ref=admin-tip`]: fileAnswer(NEW_STATE, gitBlobSha(Buffer.from(NEW_STATE))),
    });
    const run = stagedRun({published: {commit: 'app-commit', branch: BRANCH, url: PR_URL}});
    expect(publishRun(run).stateCommit).toBe('admin-tip');
    expect(writes(calls).some((call) => call.includes('inkweave-admin'))).toBe(false);
  });

  it('publishes nothing when previewCards.json moved on the base', () => {
    const calls = github({
      [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=app-tip`]: fileAnswer('{}', 'moved'),
    });
    expect(() => publishRun(stagedRun())).toThrow(/Nothing was published/);
    expect(writes(calls)).toEqual([]);
  });

  it('commits no state when the run left it unchanged', () => {
    const calls = github();
    const run = stagedRun();
    fs.writeFileSync(stateFile(run.runId), STATE);
    expect(publishRun(run).stateCommit).toBe('unchanged');
    expect(writes(calls).some((call) => call.includes('inkweave-admin'))).toBe(false);
  });

  it('opens no PR for a run that wrote no card', () => {
    const calls = github();
    const run = stagedRun();
    fs.rmSync(path.join(outDir(run.runId), 'previewCards.json'));
    expect(publishRun(run).url).toBeNull();
    expect(writes(calls).some((call) => call.endsWith('/pulls'))).toBe(false);
  });
});
