#!/usr/bin/env node
/**
 * Variant printings from admin (issue #22): Epic, Enchanted and Iconic printings, published to
 * the app as one reveals/ PR. Two steps, because the owner approves each publish:
 *
 *   stage <number>...   check each printing (printings.mjs), convert its official scan with
 *                       the app's own converter, and stage previewCards.json and the AVIFs
 *   publish <run>       open the staged PR in the app; a rerun resumes where it stopped
 *
 * Like /fetch-reveals, nothing touches a local app checkout: staging reads the app through gh,
 * and publishing writes through it (publish.mjs). state.json is never written: a printing is
 * not a card, so the fetch pipeline keeps no memory of it.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertNoOpenRevealPr} from './base.mjs';
import {UsageError, say} from './cli.mjs';
import {convertScans, removeScratch} from './convert.mjs';
import {APP_BASE, APP_REPO, branchExists, branchTip, listDir, readFile, readRaw} from './github.mjs';
import {OFFICIAL_IMAGE, OfficialListError, downloadOfficialImage, fetchOfficialList} from './official.mjs';
import {addVariants, describePrintings, planPrintings} from './printings.mjs';
import {publishAppPr} from './publish.mjs';
import {ALL_CARDS_REL, AVIF_REL, PREVIEW_REL, newRunId, outDir, readRun, runDir, writeRun} from './runstore.mjs';
import {loadSeason} from './web.mjs';
import {stageOutputs} from './write.mjs';

/** A refusal naming every reason, so the owner can fix them all before staging again. */
const nothingStaged = (problems) =>
  new UsageError(['Nothing was staged:', ...problems.map((problem) => `  ${problem}`)].join('\n'));

/**
 * The PR's branch is named for its numbers alone, so a PR for the same numbers closed
 * unmerged can leave it behind (the app keeps merged branches too).
 */
const leftOverBranch = (branch) =>
  `${APP_REPO} already has a branch ${branch}, probably left by a closed PR. Delete it first.`;

/* ------------------------------------------------------------------ stage */

/** The official list, or a UsageError: without it no printing can be checked. */
async function readOfficialList(season, fetchImpl) {
  try {
    return await fetchOfficialList(season, {fetchImpl});
  } catch (error) {
    if (!(error instanceof OfficialListError)) throw error;
    throw new UsageError(`official list unavailable: ${error.message}`);
  }
}

/** The app at master's tip: previewCards.json with its blob sha, allCards.json, and the AVIFs' names. */
function readApp() {
  const commit = branchTip(APP_REPO, APP_BASE);
  return {
    commit,
    preview: readFile(APP_REPO, PREVIEW_REL, commit),
    allCards: JSON.parse(readRaw(APP_REPO, ALL_CARDS_REL, commit)),
    avifs: listDir(APP_REPO, AVIF_REL, commit),
  };
}

/** Each printing's official scan, saved in the run; the URL it came from goes on the printing. */
async function downloadScans(run, fetchImpl) {
  const scans = [];
  const problems = [];
  for (const printing of run.printings) {
    const dir = path.join(runDir(run.runId), 'scans', String(printing.number));
    fs.mkdirSync(dir, {recursive: true});
    const got = await downloadOfficialImage(printing.entry, null, dir, {fetchImpl});
    if (got.status) {
      problems.push(`#${printing.number}: no official scan at ${got.detail}`);
      continue;
    }
    printing.scan = got.url;
    scans.push({id: printing.id, source: path.join(dir, OFFICIAL_IMAGE)});
  }
  if (problems.length) throw nothingStaged(problems);
  return scans;
}

/** Both AVIFs of every printing, made by the app's converter from the scans as they are. */
function convertArt(runId, scans) {
  const {exitCode, made} = convertScans(runId, scans);
  const madeIds = new Set(made.map(({id}) => id));
  const failed = scans.filter(({id}) => !madeIds.has(id));
  if (failed.length) {
    throw nothingStaged(failed.map(({id}) => `${id}: no AVIFs after conversion (converter exit ${exitCode})`));
  }
  return made.flatMap(({files}) => files);
}

/**
 * What staging will write, checked: the printings, their PR, and previewCards.json with them
 * in. Refuses, naming every printing's reason, before anything is downloaded.
 */
async function planStage(numbers, season, fetchImpl) {
  const official = await readOfficialList(season, fetchImpl);
  const app = readApp();
  const preview = JSON.parse(app.preview.text);
  const {printings, problems} = planPrintings(numbers, {official, preview, allCards: app.allCards, avifs: app.avifs, season});
  if (problems.length) throw nothingStaged(problems);
  const pr = describePrintings(printings, season);
  if (branchExists(APP_REPO, pr.branch)) throw nothingStaged([leftOverBranch(pr.branch)]);
  return {app, printings, pr, previewText: addVariants(app.preview.text, printings)};
}

/** The scans downloaded and converted, then out/ staged. Should any step fail, no run is left. */
async function stageFiles(run, previewText, fetchImpl) {
  try {
    stageOutputs(run.runId, previewText, convertArt(run.runId, await downloadScans(run, fetchImpl)));
  } catch (error) {
    fs.rmSync(runDir(run.runId), {recursive: true, force: true});
    throw error;
  } finally {
    removeScratch(run.runId);
  }
}

/**
 * Stage the printings `numbers` name: check each against the official list and the app's data
 * at master's tip, then convert the scans and stage previewCards.json and the AVIFs in the
 * run's out/. All or nothing: any refusal leaves no run behind. Returns the run `publish` reads.
 */
export async function stageVariants(numbers, {season, fetchImpl = fetch}) {
  if (!numbers.length) throw nothingStaged(['no collector numbers given']);
  assertNoOpenRevealPr();
  const {app, printings, pr, previewText} = await planStage(numbers, season, fetchImpl);
  const run = {
    kind: 'variants',
    runId: `variants-${newRunId()}`,
    stagedAt: new Date().toISOString(),
    season,
    appBase: APP_BASE,
    baseCommit: app.commit,
    baseBlob: app.preview.sha,
    printings,
    pr,
  };
  await stageFiles(run, previewText, fetchImpl);
  run.staged = true;
  writeRun(run);
  return run;
}

/* ---------------------------------------------------------------- publish */

/**
 * Before anything lands: no other reveal PR open, and no branch where the PR's goes. Once
 * something has, both may be this run's own, so a resume skips this.
 */
function assertClearToPublish(branch) {
  assertNoOpenRevealPr();
  if (branchExists(APP_REPO, branch)) throw new UsageError(`${leftOverBranch(branch)} Nothing was published.`);
}

/**
 * Open a staged run's PR in the app (publish.mjs): the commit on master's current tip, refused
 * if previewCards.json moved since staging, then the reveals/ branch and the PR. A rerun
 * resumes from what landed. Returns the PR's URL, and whether an earlier run had opened it.
 */
export function publishVariants(runId) {
  const run = readRun(runId);
  if (run.kind !== 'variants' || !run.staged) {
    throw new UsageError(`${runId} is not a staged variant run: stage the printings first`);
  }
  if (run.published?.url) return {url: run.published.url, already: true};
  if (!run.published?.commit) assertClearToPublish(run.pr.branch);
  publishAppPr(run, run.pr, 'Stage the printings again.');
  return {url: run.published.url, already: false};
}

/* -------------------------------------------------------------- the CLI */

/** Collector numbers from the command line: at least one, each a whole number. */
export function parseNumbers(args) {
  if (!args.length || !args.every((arg) => /^\d+$/.test(arg))) {
    throw new UsageError('usage: variants.mjs stage <collector number>... (for example: stage 215 239)');
  }
  return args.map(Number);
}

/** What the owner approves before `publish`: the printings, the commit, the PR and the art. */
export function stagedReport(run) {
  const avifs = path.join(outDir(run.runId), 'avif');
  return [
    `Staged ${run.runId} against ${APP_REPO}@${run.appBase} (${run.baseCommit.slice(0, 7)}):`,
    ...run.printings.map(
      ({number, rarity, fullName, base}) => `  #${number} ${rarity} ${fullName}, on ${base.id} ${base.fullName}`,
    ),
    '',
    `Branch: ${run.pr.branch}`,
    `Title:  ${run.pr.title}`,
    '',
    'Commit message:',
    run.pr.message,
    '',
    'PR body:',
    run.pr.body,
    '',
    'The art, to look at before approving:',
    ...fs.readdirSync(avifs).sort().map((name) => `  ${path.join(avifs, name)}`),
    '',
    `Once the owner approves: node scripts/reveal-sync/variants.mjs publish ${run.runId}`,
  ];
}

const COMMANDS = {
  async stage(args) {
    const numbers = parseNumbers(args);
    say(...stagedReport(await stageVariants(numbers, {season: await loadSeason()})));
  },
  publish([runId]) {
    if (!runId) throw new UsageError('usage: variants.mjs publish <run>');
    const {url, already} = publishVariants(runId);
    say(
      already ? `${runId} is already published: ${url}` : `Opened ${url}`,
      'Next: review the PR and merge it. Neither /fetch-reveals nor another stage starts while it is open.',
    );
  },
};

async function main([command, ...args]) {
  if (!COMMANDS[command]) throw new UsageError(`usage: variants.mjs <${Object.keys(COMMANDS).join('|')}> ...`);
  await COMMANDS[command](args);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof UsageError ? error.message : error);
    process.exit(1);
  });
}
