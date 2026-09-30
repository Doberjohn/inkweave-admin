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
import {cardDir, localDate, newRunId, writeBase, writeRun} from './runstore.mjs';
import {fullName} from './text.mjs';
import {loadSeason, loadWriteChain} from './web.mjs';
import {writePhase} from './write.mjs';
import {TEST_INVENTOR, TEST_PUP, page, readerFor} from './__fixtures__/cards.mjs';

/** Fixture cards with a scripted reader, tried in order until one's id is free on the base. */
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
const taken = new Set(JSON.parse(base.preview.text).cards.map((card) => card.id));
const pick = CANDIDATES.map(([fixture, reader]) => {
  const site = parseCardLines(page(fixture), {slug: fixture.slug, imageFile: fixture.imageFile});
  return {fixture, site, card: adjudicate(site, [reader()]).card};
}).find(({site}) => !taken.has(season.idBase + site.collector.number));
if (!pick) {
  console.error(`Every rehearsal fixture's id is taken on ${APP_BASE}; add a fixture with a scripted reader.`);
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
