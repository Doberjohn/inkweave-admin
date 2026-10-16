#!/usr/bin/env node
/**
 * Rehearse a reveal PR end to end against throwaway branches (docs/plans/P3-pipelines.md,
 * Task 20): one fixture card with a generated scan, through the real write chain, converter
 * and GitHub calls. Point REVEAL_SYNC_APP_BASE and REVEAL_SYNC_STATE_BRANCH at the
 * throwaways first; it refuses master and main.
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {adjudicate} from './adjudicate.mjs';
import {readBase} from './base.mjs';
import {parseCardLines} from './extract-card.mjs';
import {APP_BASE, STATE_BRANCH} from './github.mjs';
import {publishRun} from './publish.mjs';
import {releasedRecords} from './released.mjs';
import {cardDir, localDate, newRunId, writeBase, writeRun} from './runstore.mjs';
import {fullName} from './text.mjs';
import {loadReleasedChain, loadSeason, loadWriteChain} from './web.mjs';
import {writePhase} from './write.mjs';
import {TEST_INVENTOR, TEST_PUP, page, readerFor} from './__fixtures__/cards.mjs';

/**
 * Fixture cards with a scripted reader, tried in order until one is free on the base: its
 * number is in the set, no preview card has its id, and no released card of the set holds
 * its number. Once every number of the set is held, by preview cards before graduation or
 * released ones after it, no fixture can be, and a rehearsal waits for the next season.
 */
const CANDIDATES = [
  [TEST_PUP, readerFor.testPup],
  [TEST_INVENTOR, readerFor.testInventor],
];

if (APP_BASE === 'master' || STATE_BRANCH === 'main') {
  console.error('Point REVEAL_SYNC_APP_BASE and REVEAL_SYNC_STATE_BRANCH at throwaway branches first.');
  process.exit(1);
}

const season = await loadSeason();
const base = readBase();
const released = releasedRecords(base.allCards.cards, await loadReleasedChain());
const taken = new Set(JSON.parse(base.preview.text).cards.map((card) => card.id));
const held = new Set(released.map(({number}) => number));
const inSet = (number) => Number.isInteger(number) && number >= 1 && number <= season.setTotal;
const isFree = (number) => inSet(number) && !taken.has(season.idBase + number) && !held.has(number);
const pick = CANDIDATES.map(([fixture, reader]) => {
  const site = parseCardLines(page(fixture), {slug: fixture.slug, imageFile: fixture.imageFile});
  return {fixture, site, card: adjudicate(site, [reader()]).card};
}).find(({site}) => isFree(site.collector.number));
if (!pick) {
  const anyFree = Array.from({length: season.setTotal}, (_, i) => i + 1).some(isFree);
  console.error(
    anyFree
      ? `Every rehearsal fixture's number is taken on ${APP_BASE}, by a preview card or a released one; add a fixture with a scripted reader on a free number of set ${season.setCode}.`
      : `Every number of set ${season.setCode} (1-${season.setTotal}) is taken on ${APP_BASE}, by a preview card or a released one, so no fixture can be written there. Rehearse once the pin names the next season.`,
  );
  process.exit(1);
}

const {fixture, site, card} = pick;
const section = JSON.parse(base.state.text).sets[season.setCode] ?? {cards: {}};
const known = Object.keys(section.cards);
const run = {
  runId: newRunId(),
  startedAt: new Date().toISOString(),
  today: localDate(),
  season,
  appBase: base.appBase,
  stateBranch: base.stateBranch,
  baseBlob: base.preview.sha,
  stateBlob: base.state.sha,
  released,
  // A rehearsal never reads the official list; this stand-in lets `run.mjs write` and
  // `report` open the run like any other.
  official: {revealed: 0, lastModified: 'not read (rehearsal)'},
  // Every slug the state knows stays "on the site", so the rehearsal retires nothing.
  site: {slugs: [...known, fixture.slug], total: section.indexTotal ?? known.length + 1},
  cards: {
    [fixture.slug]: {
      number: site.collector.number,
      title: fullName(site.name, site.version),
      status: 'ready',
      card,
      image: 'official.png',
    },
  },
};
writeBase(run.runId, {previewText: base.preview.text, stateText: base.state.text});
fs.mkdirSync(cardDir(run.runId, fixture.slug), {recursive: true});
await sharp({create: {width: 734, height: 1024, channels: 3, background: '#557799'}})
  .png()
  .toFile(path.join(cardDir(run.runId, fixture.slug), 'official.png'));
writeRun(run);
writePhase(run, await loadWriteChain());
writeRun(run);
console.log(`Run ${run.runId}:`, publishRun(run));
