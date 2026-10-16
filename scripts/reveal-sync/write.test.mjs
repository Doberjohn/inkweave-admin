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
import {TEST_CHLOE, TEST_PUP, page, readerFor} from './__fixtures__/cards.mjs';
import {fakeGh, fileAnswer, table} from './__fixtures__/gh.mjs';

const chain = {validateRevealCardForm, buildPreviewCard, insertCardIntoPreviewJson};
const PREVIEW = `{\n  "sets": {},\n  "cards": []\n}\n`;
const STATE = serializeState({sets: {}});
const PUP_ID = REVEAL_ID_BASE + 40;
const APP = 'repos/Doberjohn/inkweave';
// Set 14 graduated on 2026-10-14 (Doberjohn/inkweave#780): its #21 is released as 3286, no longer 14021.
const MIGUEL = {number: 21, id: 3286, fullName: 'Miguel Rivera - Street Musician'};

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

/** The fixture's page read and adjudicated: the card a ready run card holds. */
const adjudicated = (fixture, reader) =>
  adjudicate(parseCardLines(page(fixture), {slug: fixture.slug, imageFile: fixture.imageFile}), [reader]).card;

/** A generated official scan, where the run keeps the card's. */
async function writeScan(runId, slug) {
  fs.mkdirSync(cardDir(runId, slug), {recursive: true});
  await sharp({create: {width: 734, height: 1024, channels: 3, background: '#557799'}})
    .png()
    .toFile(path.join(cardDir(runId, slug), 'official.png'));
}

/**
 * A run at `write`: TEST_PUP read, adjudicated and ready, beside any `more` ready cards, each
 * with its scan in the run. `released` is the set's released cards, as `start` keeps them.
 */
async function readyRun({released = [], more = {}} = {}) {
  const cards = {
    [TEST_PUP.slug]: {
      number: 40,
      title: 'Test Pup - Tiny Troublemaker',
      status: 'ready',
      card: adjudicated(TEST_PUP, readerFor.testPup()),
      image: 'official.png',
    },
    ...more,
  };
  const slugs = Object.keys(cards);
  const run = {
    runId: 'write-test',
    today: '2026-10-01',
    season: {setCode: String(REVEAL_SET_CODE), idBase: REVEAL_ID_BASE},
    appBase: 'master',
    stateBranch: 'main',
    baseBlob: 'preview-blob',
    stateBlob: 'state-blob',
    released,
    site: {slugs, total: slugs.length},
    cards,
  };
  writeBase(run.runId, {previewText: PREVIEW, stateText: STATE});
  for (const slug of slugs) await writeScan(run.runId, slug);
  return run;
}

/** Test Chloé read and ready at #21, an Amber number like her own #9: the number Miguel Rivera holds. */
function chloeAt21() {
  const card = {...adjudicated(TEST_CHLOE, readerFor.testChloe()), number: 21};
  return {number: 21, title: 'Test Chloe - Cafe Owner', status: 'ready', card, image: 'official.png'};
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

  // previewCards.json holds none of a graduated set's cards, so only the released card shows #21 is taken.
  it('refuses a number a released card of the set holds, as Card studio does, and writes the rest', async () => {
    github();
    const run = await readyRun({released: [MIGUEL], more: {[TEST_CHLOE.slug]: chloeAt21()}});
    expect(writePhase(run, chain).written).toBe(1);
    expect(run.cards[TEST_CHLOE.slug]).toMatchObject({
      status: 'conflict',
      reason: 'validation-failed',
      detail: '#21 is already Miguel Rivera - Street Musician (3286)',
    });
    expect(run.cards[TEST_PUP.slug]).toMatchObject({status: 'written', id: PUP_ID});
    const out = outDir(run.runId);
    const preview = JSON.parse(fs.readFileSync(path.join(out, 'previewCards.json'), 'utf8'));
    expect(preview.cards.map((card) => card.id)).toEqual([PUP_ID]);
    expect(fs.readdirSync(path.join(out, 'avif')).sort()).toEqual([`${PUP_ID}-sm.avif`, `${PUP_ID}.avif`]);
  }, 60_000);

  it('writes nothing when previewCards.json changed on the base since start', async () => {
    github({previewSha: 'someone-else'});
    const run = await readyRun();
    expect(() => writePhase(run, chain)).toThrow(/changed on Doberjohn\/inkweave@master/);
    expect(fs.existsSync(outDir(run.runId))).toBe(false);
    expect(run.cards[TEST_PUP.slug].status).toBe('ready');
  }, 60_000);
});
