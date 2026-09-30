// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {validateRevealCardForm} from '../../src/tools/reveal/validateForm.ts';
import {buildPreviewCard} from '../../src/tools/reveal/buildPreviewCard.ts';
import {insertCardIntoPreviewJson} from '../../src/tools/reveal/insertCardIntoPreviewJson.ts';
import {REVEAL_ID_BASE, REVEAL_SET_CODE} from '../../src/tools/reveal/constants.ts';
import {adjudicate} from './adjudicate.mjs';
import {parseCardLines} from './extract-card.mjs';
import {setGhRunner} from './github.mjs';
import {cardDir, outDir, readState, writeBase} from './runstore.mjs';
import {serializeState} from './state.mjs';
import {writePhase} from './write.mjs';
import {TEST_PUP, page, readerFor} from './__fixtures__/cards.mjs';
import {fakeGh, fileAnswer, table} from './__fixtures__/gh.mjs';

const chain = {validateRevealCardForm, buildPreviewCard, insertCardIntoPreviewJson};
const PREVIEW = `{\n  "sets": {},\n  "cards": []\n}\n`;
const STATE = serializeState({sets: {}});
const PUP_ID = REVEAL_ID_BASE + 40;
const APP = 'repos/Doberjohn/inkweave';

/** gh as `write` sees it: both bases unchanged, and `art` already in the app's AVIF folder. */
function github({previewSha = 'preview-blob', art = []} = {}) {
  fakeGh(
    table({
      [`GET ${APP}/contents/apps/web/public/data/previewCards.json?ref=master`]: fileAnswer(PREVIEW, previewSha),
      'GET repos/Doberjohn/inkweave-admin/contents/scripts/reveal-sync/state.json?ref=main': fileAnswer(STATE, 'state-blob'),
      [`GET ${APP}/contents/apps/web/public?ref=master`]: [{name: 'card-images-preview', type: 'dir', sha: 'avif-tree'}],
      [`GET ${APP}/git/trees/avif-tree`]: {tree: art.map((name) => ({path: name}))},
    }),
  );
}

/** A run at `write`: TEST_PUP read, adjudicated and ready, with its scan in the run. */
async function readyRun() {
  const site = parseCardLines(page(TEST_PUP), {slug: TEST_PUP.slug, imageFile: TEST_PUP.imageFile});
  const run = {
    runId: 'write-test',
    today: '2026-10-01',
    season: {setCode: String(REVEAL_SET_CODE), idBase: REVEAL_ID_BASE},
    appBase: 'master',
    stateBranch: 'main',
    baseBlob: 'preview-blob',
    stateBlob: 'state-blob',
    site: {slugs: [TEST_PUP.slug], total: 1},
    cards: {
      [TEST_PUP.slug]: {
        number: 40,
        title: 'Test Pup - Tiny Troublemaker',
        status: 'ready',
        card: adjudicate(site, [readerFor.testPup()]).card,
        image: 'official.png',
      },
    },
  };
  writeBase(run.runId, {previewText: PREVIEW, stateText: STATE});
  fs.mkdirSync(cardDir(run.runId, TEST_PUP.slug), {recursive: true});
  await sharp({create: {width: 734, height: 1024, channels: 3, background: '#557799'}})
    .png()
    .toFile(path.join(cardDir(run.runId, TEST_PUP.slug), 'official.png'));
  return run;
}

beforeEach(() => vi.stubEnv('REVEAL_SYNC_RUNS', fs.mkdtempSync(path.join(os.tmpdir(), 'reveal-sync-runs-'))));
afterEach(() => {
  vi.unstubAllEnvs();
  setGhRunner();
});

describe('writePhase', () => {
  it('stages the card, its converted art and its state for publishing', async () => {
    github();
    const run = await readyRun();
    const {written, section} = writePhase(run, chain);
    expect(written).toBe(1);
    expect(run.cards[TEST_PUP.slug]).toMatchObject({status: 'written', id: PUP_ID});
    const out = outDir(run.runId);
    const preview = JSON.parse(fs.readFileSync(path.join(out, 'previewCards.json'), 'utf8'));
    expect(preview.cards.map((card) => card.id)).toEqual([PUP_ID]);
    expect(fs.readdirSync(path.join(out, 'avif')).sort()).toEqual([`${PUP_ID}-sm.avif`, `${PUP_ID}.avif`]);
    expect(section.cards[TEST_PUP.slug]).toMatchObject({number: 40, status: 'written'});
    expect(readState(run.runId).sets[run.season.setCode].cards[TEST_PUP.slug].status).toBe('written');
    expect(run.staged).toBe(true);
  }, 60_000);

  it('keeps art the app already has, and converts nothing', async () => {
    github({art: [`${PUP_ID}.avif`, `${PUP_ID}-sm.avif`]});
    const run = await readyRun();
    expect(writePhase(run, chain).written).toBe(1);
    expect(fs.readdirSync(path.join(outDir(run.runId), 'avif'))).toEqual([]);
  }, 60_000);

  it('writes nothing when previewCards.json changed on the base since start', async () => {
    github({previewSha: 'someone-else'});
    const run = await readyRun();
    expect(() => writePhase(run, chain)).toThrow(/changed on Doberjohn\/inkweave@master/);
    expect(fs.existsSync(outDir(run.runId))).toBe(false);
    expect(run.cards[TEST_PUP.slug].status).toBe('ready');
  }, 60_000);
});
