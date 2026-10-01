/**
 * Where a run lives on disk, and how browser downloads get there.
 *
 * Runs live outside the repo (the OS temp dir by default, REVEAL_SYNC_RUNS to override), so
 * the vision agents' crops and results never touch the working tree. The page's downloads
 * land in the owner's Downloads folder (REVEAL_SYNC_DOWNLOADS to override) and are moved into
 * the run as soon as they finish.
 *
 * A run works from the base `start` read through gh (base.mjs): the app's previewCards.json
 * and admin's state.json. `write` stages what the run publishes in out/, and publish.mjs
 * pushes it.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {UsageError} from './cli.mjs';
import {serializeState} from './state.mjs';

/** The app's preview data, as a path in the app repo. */
export const PREVIEW_REL = 'apps/web/public/data/previewCards.json';
/** The app's canonical card data: over the contents API's 1 MB limit, so read raw. */
export const ALL_CARDS_REL = 'apps/web/public/data/allCards.json';
/** The app folder that holds preview cards' AVIFs. */
export const AVIF_REL = 'apps/web/public/card-images-preview';
/** Run-to-run memory, as a path in admin's repo (docs/plans/P3-pipelines.md, P3-5). */
export const STATE_REL = 'scripts/reveal-sync/state.json';

/** Read on every call, so a test or the rehearsal can point it elsewhere. */
const runsRoot = () => process.env.REVEAL_SYNC_RUNS ?? path.join(os.tmpdir(), 'inkweave-reveal-sync');
const DOWNLOADS = process.env.REVEAL_SYNC_DOWNLOADS ?? path.join(os.homedir(), 'Downloads');

export const runDir = (runId) => path.join(runsRoot(), runId);
export const cardDir = (runId, slug) => path.join(runDir(runId), 'cards', slug);
/** What `write` stages for the app PR: previewCards.json and avif/. */
export const outDir = (runId) => path.join(runDir(runId), 'out');
/** The run's state.json: the base as `start` read it, then as `write` left it. */
export const stateFile = (runId) => path.join(runDir(runId), 'state.json');
const previewFile = (runId) => path.join(runDir(runId), 'preview.json');

/**
 * A blind reader's folder: a random token, holding only its copy of the card image and
 * whatever the reader writes. No slug in the path (the slug spells the site's name and
 * version, the fields a reader is there to confirm), no site record beside the image, and
 * its own folder so readers never read each other's crops.
 */
export const blindDir = (runId, token) => path.join(runDir(runId), 'blind', token);

const two = (n) => String(n).padStart(2, '0');

export function newRunId(now = new Date()) {
  const date = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}`;
  return `${date}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
}

/** YYYY-MM-DD in local time. */
export const localDate = (now = new Date()) => now.toLocaleDateString('en-CA');

const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

export function writeRun(run) {
  fs.mkdirSync(runDir(run.runId), {recursive: true});
  writeJson(path.join(runDir(run.runId), 'run.json'), run);
}

export function readRun(runId) {
  const file = path.join(runDir(runId ?? ''), 'run.json');
  if (!runId || !fs.existsSync(file)) throw new Error(`no run "${runId}" under ${runsRoot()}`);
  return readJson(file);
}

const officialFile = (runId) => path.join(runDir(runId), 'official.json');
const siteFile = (runId, slug) => path.join(cardDir(runId, slug), 'site.json');

/** A file an earlier step of the run wrote. Missing, the run cannot go on. */
function readRunText(file, what) {
  if (!fs.existsSync(file)) throw new UsageError(`${what} is missing (${file}). Start a new run.`);
  return fs.readFileSync(file, 'utf8');
}

/** The same, parsed. Not valid JSON, the run cannot go on either. */
function readRunFile(file, what) {
  const text = readRunText(file, what);
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new UsageError(`${what} is not valid JSON (${file}: ${error.message}). Start a new run.`);
  }
}

/** The official list as `start` read it: every later step of the run judges against this one snapshot. */
export const writeOfficial = (runId, official) => writeJson(officialFile(runId), official);
export const readOfficial = (runId) =>
  readRunFile(officialFile(runId), `run ${runId}'s official list`);

/**
 * The record a card is judged on: lorcanaplayer's page as parsed, plus any collector number
 * the official list supplied and any ruling the owner made on the two sites' disagreements.
 */
export function writeSite(runId, slug, site) {
  fs.mkdirSync(cardDir(runId, slug), {recursive: true});
  writeJson(siteFile(runId, slug), site);
}

export const readSite = (runId, slug) =>
  readRunFile(siteFile(runId, slug), `the site record for ${slug}`);

/** The run's base, as `start` read it: the app's preview data and admin's state. */
export function writeBase(runId, {previewText, stateText}) {
  fs.mkdirSync(runDir(runId), {recursive: true});
  fs.writeFileSync(previewFile(runId), previewText);
  fs.writeFileSync(stateFile(runId), stateText);
}

/** The app's previewCards.json, as the run's base holds it. */
export const readPreviewText = (runId) => readRunText(previewFile(runId), `run ${runId}'s preview data`);

export const readState = (runId) => readRunFile(stateFile(runId), `run ${runId}'s state`);

export function writeState(runId, state) {
  fs.writeFileSync(stateFile(runId), serializeState(state));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** The newest finished download for `name`, including Chrome's "name (1).json" re-download copies. */
function findDownload(name) {
  const stem = name.replace(/\.json$/, '');
  const matches = fs
    .readdirSync(DOWNLOADS)
    .filter((f) => f === name || (f.startsWith(`${stem} (`) && f.endsWith(').json')))
    .map((f) => path.join(DOWNLOADS, f));
  return matches.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
}

/** Copy a finished download into the run, and only once it parses, clear it from Downloads. */
function adopt(found, target) {
  fs.copyFileSync(found[0], target);
  try {
    JSON.parse(fs.readFileSync(target, 'utf8'));
  } catch (error) {
    fs.rmSync(target);
    throw new Error(`${found[0]} is not valid JSON (${error.message}); fetch it again`, {
      cause: error,
    });
  }
  for (const file of found) fs.rmSync(file);
  return target;
}

/**
 * The run's copy of a browser download, waiting for it to land first if need be. A file the
 * run already holds is reused, so a step can be re-run. Chrome writes "<name>.crdownload" and
 * renames on completion, so the final name at a size that holds across two polls is complete.
 */
export async function takeDownload(name, runId, {timeoutMs = 90_000} = {}) {
  const target = path.join(runDir(runId), name);
  if (fs.existsSync(target)) return target;
  const deadline = Date.now() + timeoutMs;
  let lastSize = -1;
  while (Date.now() < deadline) {
    const found = findDownload(name);
    const size = found.length ? fs.statSync(found[0]).size : -1;
    if (size > 0 && size === lastSize) return adopt(found, target);
    lastSize = size;
    await sleep(1000);
  }
  throw new Error(`timed out after ${timeoutMs / 1000}s waiting for ${name} in ${DOWNLOADS}`);
}
