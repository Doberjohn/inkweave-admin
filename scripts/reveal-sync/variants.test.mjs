// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {UsageError} from './cli.mjs';
import {scratchFor} from './convert.mjs';
import {setGhRunner} from './github.mjs';
import {OFFICIAL_ORIGIN} from './official.mjs';
import {outDir, readRun, writeRun} from './runstore.mjs';
import {parseNumbers, publishVariants, stageVariants, stagedReport} from './variants.mjs';
import {ROOT} from './web.mjs';
import {fakeGh, fileAnswer, ghError, rawAnswer, table} from './__fixtures__/gh.mjs';
import {
  APP_AVIFS,
  HECTOR,
  JUDY,
  OFFICIAL_SLOTS,
  SEASON,
  THE_QUEEN,
  TIANA,
  allCardsOf,
  officialJson,
  previewOf,
} from './__fixtures__/printings.mjs';

const APP = 'repos/Doberjohn/inkweave';
const OPEN_PRS = `GET ${APP}/pulls?state=open&per_page=100&page=1`;
const PREVIEW_TEXT = `${JSON.stringify(previewOf(HECTOR, TIANA, JUDY), null, 2)}\n`;
const OPEN_REVEAL_PR = {number: 700, html_url: 'https://github.com/Doberjohn/inkweave/pull/700', head: {ref: 'reveals/set14-20261001-101500'}};
const BRANCH = 'reveals/set14-variants-215-239';
const BRANCH_REF = `GET ${APP}/git/ref/heads/${BRANCH}`;
/** A branch a closed PR left behind, at its own commit. */
const LEFT_OVER = {object: {sha: 'old-commit'}};

/** gh as `stage` finds it on 2026-10-01: no reveal PR open, and the app's data at master's tip. */
const STAGE_ANSWERS = {
  [OPEN_PRS]: [],
  [`GET ${APP}/git/ref/heads/master`]: {object: {sha: 'app-tip'}},
  [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=app-tip`]: fileAnswer(PREVIEW_TEXT, 'preview-blob'),
  [`GET ${APP}/contents/apps/web/public/data/allCards.json?ref=app-tip`]: rawAnswer(
    `${JSON.stringify(allCardsOf(THE_QUEEN), null, 2)}\n`,
  ),
  [`GET ${APP}/contents/apps/web/public?ref=app-tip`]: [{name: 'card-images-preview', type: 'dir', sha: 'avif-tree'}],
  [`GET ${APP}/git/trees/avif-tree`]: {tree: APP_AVIFS.map((name) => ({path: name}))},
  [BRANCH_REF]: ghError('gh: Not Found (HTTP 404)\n'),
};

/** The scratch copies of the converter a variants run left in admin's root. */
function scratchLeft() {
  const dir = path.join(ROOT, '.reveal-sync-convert');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter((name) => name.startsWith('variants-')) : [];
}

const SCAN_215 = `${OFFICIAL_ORIGIN}/card-images/215-he-ctor-rivera-street-musician-1024.webp`;
const SCAN_239 = `${OFFICIAL_ORIGIN}/card-images/239-tiana-party-hostess-1024.webp`;

/** A card-sized WebP standing in for an official scan. */
const webp = () =>
  sharp({create: {width: 734, height: 1024, channels: 3, background: '#557799'}})
    .webp()
    .toBuffer();

/**
 * illumineertales.com: the official list, and the scans named in `scans` (anything else is
 * its 404 page). A scan in `broken` is served as WebP but is not an image. Records every URL
 * asked for.
 */
async function officialSite({scans = [SCAN_215, SCAN_239], broken = [], list = officialJson(...OFFICIAL_SLOTS), status = 200} = {}) {
  const bytes = await webp();
  const requested = [];
  const asWebp = (body) => new Response(body, {headers: {'content-type': 'image/webp'}});
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url === `${OFFICIAL_ORIGIN}/cards.json`) return new Response(JSON.stringify(list), {status});
    if (broken.includes(url)) return asWebp('RIFF, but no image');
    if (scans.includes(url)) return asWebp(bytes);
    return new Response('<html>', {status: 404, headers: {'content-type': 'text/html'}});
  };
  return {fetchImpl, requested};
}

/** The calls that write, in order. */
const writes = (calls) => calls.filter(({method}) => method !== 'GET').map(({method, endpoint}) => `${method} ${endpoint}`);

/** The body of the app repo POST to `endpoint`. */
const posted = (calls, endpoint) => calls.find((call) => call.method === 'POST' && call.endpoint === `${APP}/${endpoint}`).body;

let runsRoot;
beforeEach(() => {
  runsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-runs-'));
  vi.stubEnv('REVEAL_SYNC_RUNS', runsRoot);
});
afterEach(() => {
  vi.unstubAllEnvs();
  setGhRunner();
  fs.rmSync(runsRoot, {recursive: true, force: true});
});

describe('stageVariants', () => {
  it('stages the printings on their base cards, with AVIFs converted from the official scans', async () => {
    fakeGh(table(STAGE_ANSWERS));
    const {fetchImpl} = await officialSite();
    const run = await stageVariants([215, 239], {season: SEASON, fetchImpl});

    expect(run).toMatchObject({kind: 'variants', appBase: 'master', baseCommit: 'app-tip', baseBlob: 'preview-blob', staged: true});
    expect(run.printings.map(({number, id, scan}) => [number, id, scan])).toEqual([
      [215, 14215, SCAN_215],
      [239, 14239, SCAN_239],
    ]);
    expect(run.pr.branch).toBe('reveals/set14-variants-215-239');
    expect(readRun(run.runId)).toEqual(run);

    const out = outDir(run.runId);
    const staged = JSON.parse(fs.readFileSync(path.join(out, 'previewCards.json'), 'utf8'));
    expect(staged.cards.map(({id, variants}) => [id, variants])).toEqual([
      [14117, [{id: 14215, rarity: 'Epic', number: 215}]],
      [14196, [{id: 14239, rarity: 'Enchanted', number: 239}]],
      [14024, [{id: 14206, rarity: 'Epic', number: 206}]],
    ]);
    expect(fs.readdirSync(path.join(out, 'avif')).sort()).toEqual(['14215-sm.avif', '14215.avif', '14239-sm.avif', '14239.avif']);
    expect(fs.existsSync(scratchFor(run.runId).root)).toBe(false);

    // The owner approves from this: the whole commit and PR, and the art to look at.
    const report = stagedReport(run).join('\n');
    for (const text of [run.pr.message, run.pr.title, run.pr.body, `variants.mjs publish ${run.runId}`]) expect(report).toContain(text);
    for (const name of ['14215.avif', '14215-sm.avif', '14239.avif', '14239-sm.avif']) {
      expect(report).toContain(path.join(out, 'avif', name));
    }
  }, 60_000);

  it('stages nothing while a reveal PR is open, and reads nothing else', async () => {
    const calls = fakeGh(table({...STAGE_ANSWERS, [OPEN_PRS]: [OPEN_REVEAL_PR]}));
    const {fetchImpl, requested} = await officialSite();
    await expect(stageVariants([215], {season: SEASON, fetchImpl})).rejects.toThrow(/pull\/700/);
    expect(calls.map(({method, endpoint}) => `${method} ${endpoint}`)).toEqual([OPEN_PRS]);
    expect(requested).toEqual([]);
    expect(fs.readdirSync(runsRoot)).toEqual([]);
  });

  it('stages nothing for no numbers, and asks GitHub nothing', async () => {
    const calls = fakeGh(table(STAGE_ANSWERS));
    const {fetchImpl} = await officialSite();
    await expect(stageVariants([], {season: SEASON, fetchImpl})).rejects.toThrow(UsageError);
    expect(calls).toEqual([]);
  });

  // The name holds only the numbers, so a closed PR's branch for the same numbers blocks it.
  it("stages nothing while the PR's branch is left over from a closed PR, and downloads nothing", async () => {
    fakeGh(table({...STAGE_ANSWERS, [BRANCH_REF]: LEFT_OVER}));
    const {fetchImpl, requested} = await officialSite();
    await expect(stageVariants([215, 239], {season: SEASON, fetchImpl})).rejects.toThrow(
      /already has a branch reveals\/set14-variants-215-239/,
    );
    expect(requested).toEqual([`${OFFICIAL_ORIGIN}/cards.json`]);
    expect(fs.readdirSync(runsRoot)).toEqual([]);
  });

  it('lists every refused printing, and downloads and stages nothing', async () => {
    fakeGh(table(STAGE_ANSWERS));
    const {fetchImpl, requested} = await officialSite();
    const staging = stageVariants([205, 213, 215], {season: SEASON, fetchImpl});
    await expect(staging).rejects.toThrow(UsageError);
    await expect(staging).rejects.toThrow(/Nothing was staged[\s\S]*#205: [\s\S]*#213: /);
    expect(requested).toEqual([`${OFFICIAL_ORIGIN}/cards.json`]);
    expect(fs.readdirSync(runsRoot)).toEqual([]);
  });

  it('stages nothing when a scan cannot be downloaded, naming the URL tried', async () => {
    fakeGh(table(STAGE_ANSWERS));
    const {fetchImpl} = await officialSite({scans: [SCAN_215]});
    await expect(stageVariants([215, 239], {season: SEASON, fetchImpl})).rejects.toThrow(
      /#239: no official scan .*239-tiana-party-hostess-1024\.webp \(HTTP 404\)/,
    );
    expect(fs.readdirSync(runsRoot)).toEqual([]);
  });

  it('stages nothing when the converter cannot read a scan', async () => {
    fakeGh(table(STAGE_ANSWERS));
    const {fetchImpl} = await officialSite({scans: [SCAN_215], broken: [SCAN_239]});
    const staging = stageVariants([215, 239], {season: SEASON, fetchImpl});
    await expect(staging).rejects.toThrow(/14239: no AVIFs after conversion/);
    expect(fs.readdirSync(runsRoot)).toEqual([]);
    expect(scratchLeft()).toEqual([]);
  }, 60_000);

  it('stages nothing without the official list', async () => {
    fakeGh(table(STAGE_ANSWERS));
    const {fetchImpl} = await officialSite({status: 503});
    await expect(stageVariants([215], {season: SEASON, fetchImpl})).rejects.toThrow(/official list unavailable: .*HTTP 503/);
    expect(fs.readdirSync(runsRoot)).toEqual([]);
  });
});

const PR = {
  branch: BRANCH,
  message: 'feat(reveals): add two Set 14 variant printings (215, 239)\n\nThe staged commit body.',
  title: 'feat(reveals): add the Epic of Héctor Rivera and the Enchanted of Tiana (215, 239)',
  body: 'The staged PR body.',
};
const PR_URL = 'https://github.com/Doberjohn/inkweave/pull/690';
const OWN_PR = {number: 690, html_url: PR_URL, head: {ref: PR.branch}};

/** gh as `publish` finds it: master moved on, but not previewCards.json. */
const PUBLISH_ANSWERS = {
  [OPEN_PRS]: [],
  [`GET ${APP}/git/ref/heads/master`]: {object: {sha: 'app-tip-2'}},
  [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=app-tip-2`]: fileAnswer(PREVIEW_TEXT, 'preview-blob'),
  [`GET ${APP}/git/commits/app-tip-2`]: {tree: {sha: 'app-tree'}},
  [`POST ${APP}/git/blobs`]: {sha: 'blob'},
  [`POST ${APP}/git/trees`]: {sha: 'tree'},
  [`POST ${APP}/git/commits`]: {sha: 'app-commit'},
  [`POST ${APP}/git/refs`]: {ref: `refs/heads/${PR.branch}`},
  [`POST ${APP}/pulls`]: {html_url: PR_URL},
  [BRANCH_REF]: ghError('gh: Not Found (HTTP 404)\n'),
};
const BRANCH_TAKEN = ghError('gh: Reference already exists (HTTP 422)\n');

/** A run `stage` left: the PR to open, its previewCards.json and two printings' AVIFs. */
function stagedRun(overrides = {}) {
  const run = {
    kind: 'variants',
    runId: 'variants-publish-test',
    season: SEASON,
    appBase: 'master',
    baseCommit: 'app-tip',
    baseBlob: 'preview-blob',
    printings: [],
    pr: PR,
    staged: true,
    ...overrides,
  };
  const out = outDir(run.runId);
  fs.mkdirSync(path.join(out, 'avif'), {recursive: true});
  fs.writeFileSync(path.join(out, 'previewCards.json'), PREVIEW_TEXT);
  for (const name of ['14215.avif', '14215-sm.avif', '14239.avif', '14239-sm.avif']) fs.writeFileSync(path.join(out, 'avif', name), name);
  writeRun(run);
  return run;
}

describe('publishVariants', () => {
  it("opens the staged PR from master's tip, and writes nothing to admin", () => {
    const calls = fakeGh(table(PUBLISH_ANSWERS));
    const run = stagedRun();
    expect(publishVariants(run.runId)).toEqual({url: PR_URL, already: false});
    expect(writes(calls)).toEqual([
      ...Array(5).fill(`POST ${APP}/git/blobs`),
      `POST ${APP}/git/trees`,
      `POST ${APP}/git/commits`,
      `POST ${APP}/git/refs`,
      `POST ${APP}/pulls`,
    ]);
    expect(posted(calls, 'git/commits')).toMatchObject({message: PR.message, parents: ['app-tip-2']});
    expect(posted(calls, 'git/trees').tree.map(({path: file}) => file).sort()).toEqual([
      'apps/web/public/card-images-preview/14215-sm.avif',
      'apps/web/public/card-images-preview/14215.avif',
      'apps/web/public/card-images-preview/14239-sm.avif',
      'apps/web/public/card-images-preview/14239.avif',
      'apps/web/public/data/previewCards.json',
    ]);
    expect(posted(calls, 'pulls')).toEqual({
      head: PR.branch,
      base: 'master',
      title: PR.title,
      body: PR.body,
    });
    expect(calls.some(({endpoint}) => endpoint.includes('inkweave-admin'))).toBe(false);
    expect(readRun(run.runId).published).toEqual({commit: 'app-commit', branch: PR.branch, url: PR_URL});
  });

  it('publishes nothing while another reveal PR is open', () => {
    const calls = fakeGh(table({...PUBLISH_ANSWERS, [OPEN_PRS]: [OPEN_REVEAL_PR]}));
    expect(() => publishVariants(stagedRun().runId)).toThrow(/pull\/700/);
    expect(writes(calls)).toEqual([]);
  });

  it('publishes nothing when previewCards.json moved since staging', () => {
    const calls = fakeGh(
      table({
        ...PUBLISH_ANSWERS,
        [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=app-tip-2`]: fileAnswer(PREVIEW_TEXT, 'moved'),
      }),
    );
    expect(() => publishVariants(stagedRun().runId)).toThrow(/changed on Doberjohn\/inkweave@master.*Stage the printings again/);
    expect(writes(calls)).toEqual([]);
  });

  it("publishes nothing while the PR's branch is left over from a closed PR", () => {
    const calls = fakeGh(table({...PUBLISH_ANSWERS, [BRANCH_REF]: LEFT_OVER}));
    expect(() => publishVariants(stagedRun().runId)).toThrow(/already has a branch reveals\/set14-variants-215-239/);
    expect(writes(calls)).toEqual([]);
  });

  // The branch was made, but the answer never arrived: it is at this run's own commit.
  it('resumes after the commit, taking the branch an interrupted attempt made', () => {
    const calls = fakeGh(table({...PUBLISH_ANSWERS, [`POST ${APP}/git/refs`]: BRANCH_TAKEN, [BRANCH_REF]: {object: {sha: 'app-commit'}}}));
    const run = stagedRun({published: {commit: 'app-commit'}});
    expect(publishVariants(run.runId)).toEqual({url: PR_URL, already: false});
    expect(writes(calls)).toEqual([`POST ${APP}/git/refs`, `POST ${APP}/pulls`]);
    expect(readRun(run.runId).published).toEqual({commit: 'app-commit', branch: PR.branch, url: PR_URL});
  });

  it('says what to do when another commit holds the branch after the commit landed, then resumes once it is gone', () => {
    const run = stagedRun({published: {commit: 'app-commit'}});
    fakeGh(table({...PUBLISH_ANSWERS, [`POST ${APP}/git/refs`]: BRANCH_TAKEN, [BRANCH_REF]: LEFT_OVER}));
    expect(() => publishVariants(run.runId)).toThrow(UsageError);
    expect(() => publishVariants(run.runId)).toThrow(/reveals\/set14-variants-215-239 at another commit\. Delete it/);
    const calls = fakeGh(table(PUBLISH_ANSWERS));
    expect(publishVariants(run.runId)).toEqual({url: PR_URL, already: false});
    expect(writes(calls)).toEqual([`POST ${APP}/git/refs`, `POST ${APP}/pulls`]);
  });

  it("refuses to resume while a reveal PR other than this run's own is open", () => {
    const calls = fakeGh(table({...PUBLISH_ANSWERS, [OPEN_PRS]: [OWN_PR, OPEN_REVEAL_PR]}));
    const run = stagedRun({published: {commit: 'app-commit', branch: PR.branch}});
    expect(() => publishVariants(run.runId)).toThrow(/pull\/700/);
    expect(writes(calls)).toEqual([]);
  });

  // The PR was opened, but the answer never arrived: it is this run's own open reveal PR.
  it('resumes after the branch and takes the PR an interrupted attempt opened', () => {
    const calls = fakeGh(table({...PUBLISH_ANSWERS, [OPEN_PRS]: [OWN_PR]}));
    const run = stagedRun({published: {commit: 'app-commit', branch: PR.branch}});
    expect(publishVariants(run.runId)).toEqual({url: PR_URL, already: false});
    expect(writes(calls)).toEqual([]);
    expect(readRun(run.runId).published.url).toBe(PR_URL);
  });

  it('calls nothing for a run already published', () => {
    const calls = fakeGh(table(PUBLISH_ANSWERS));
    const run = stagedRun({published: {commit: 'app-commit', branch: PR.branch, url: PR_URL}});
    expect(publishVariants(run.runId)).toEqual({url: PR_URL, already: true});
    expect(calls).toEqual([]);
  });

  it('refuses a run that is not a staged variant run', () => {
    fakeGh(table(PUBLISH_ANSWERS));
    expect(() => publishVariants(stagedRun({kind: undefined}).runId)).toThrow(UsageError);
    expect(() => publishVariants(stagedRun({staged: false}).runId)).toThrow(/stage/);
  });
});

describe('parseNumbers', () => {
  it('reads collector numbers, and refuses anything else or nothing', () => {
    expect(parseNumbers(['215', '239'])).toEqual([215, 239]);
    for (const args of [[], ['215', 'x'], ['14.5'], ['-3']]) expect(() => parseNumbers(args)).toThrow(UsageError);
  });
});
