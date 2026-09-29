#!/usr/bin/env node
// Synergy Spotlight banner exporter (docs/BANNER.md). Given a card id, renders
// every carousel page of its synergy breakdown through admin's /banner/:cardId
// route and writes shareable images to reports/banners/<id>/:
//   - <slug>-page-N.png         full-res 3600x3720 lossless            (Reddit)
//   - <slug>-page-N-fb2048.jpg  2048px on the longest side, 4:4:4 JPEG (Facebook)
//
// Reuses an admin dev server already on :5180, otherwise starts a throwaway one
// and stops it afterwards. Card data and synergies come through that server's
// /data/ forward, so the images match what inkweave.ink serves.
// Usage: pnpm banner <cardId>        e.g. pnpm banner 2983
import {execFileSync, spawn} from 'node:child_process';
import {mkdirSync, readdirSync, rmSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// The page's own paging constants, so the two can't drift.
import {MAX_GROUPS, ROWS_PER_PAGE} from '../src/tools/banner/bannerPaging.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 5180;
const ORIGIN = `http://localhost:${PORT}`;
const DSF = 3; // deviceScaleFactor -> 1200x1240 stage renders at 3600x3720
const FB_EDGE = 2048; // Facebook resizes photos longer than this on either side
// allCards.json comes through the dev server's forward to inkweave.ink.
const REQUEST_TIMEOUT_MS = 60_000;
// How long a page's fonts and art may take once the stage is up.
const ART_TIMEOUT_MS = 60_000;
// What capturePages names its files; staleExports only ever lists these.
const GENERATED = /-page-\d+(\.png|-fb2048\.jpg)$/;

/**
 * How many carousel pages to render for a card with `groupCount` synergy groups:
 * BannerPage's slicing (bannerPaging.ts), so the export renders exactly the pages
 * the route produces, never a blank or repeated one.
 */
export function pageCountForGroups(groupCount) {
  const shown = Math.min(groupCount, MAX_GROUPS);
  return Math.max(1, Math.ceil(shown / ROWS_PER_PAGE));
}

/** File-name slug from a card's full name. */
export function slugFor(fullName) {
  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Exported files in a card's folder that this run did not write: pages beyond
 * the new page count, or files under the card's old name. Anything the exporter
 * didn't name is left alone.
 */
export function staleExports(existing, written) {
  const kept = new Set(written.map((file) => path.basename(file)));
  return existing.filter((name) => GENERATED.test(name) && !kept.has(name));
}

/** Deletes the stale exports from `outDir` and returns their names. */
function removeStaleExports(outDir, written) {
  const stale = staleExports(readdirSync(outDir), written);
  for (const name of stale) rmSync(path.join(outDir, name));
  return stale;
}

/** JSON from the dev server, or null when the file is missing (the SPA fallback answers with HTML). */
async function getJson(url) {
  try {
    const res = await fetch(url, {signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return null;
    return await res.json();
  } catch (e) {
    throw new Error(`Could not fetch ${url}: ${e.message}`, {cause: e});
  }
}

async function serverUp() {
  try {
    return (await fetch(`${ORIGIN}/`)).ok;
  } catch {
    return false;
  }
}

const IS_WINDOWS = process.platform === 'win32';
let server = null;

/**
 * Starts `pnpm exec vite` so that stopServer can end its whole process tree.
 * Windows needs a shell for pnpm.cmd (one command string: Node deprecates an
 * args array with shell mode, DEP0190), and taskkill /T ends the tree.
 * Elsewhere pnpm leads its own process group, which stopServer signals whole.
 */
function startServer() {
  const options = {cwd: ROOT, stdio: 'ignore'};
  return IS_WINDOWS
    ? spawn('pnpm exec vite', {...options, shell: true})
    : spawn('pnpm', ['exec', 'vite'], {...options, detached: true});
}

/** True when this run started the server (and so must stop it). */
async function ensureServer() {
  if (await serverUp()) return false;
  console.log(`Starting a throwaway admin dev server on :${PORT} …`);
  server = startServer();
  for (let i = 0; i < 60; i++) {
    if (await serverUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`The dev server did not come up on :${PORT} within 60s. Has pnpm build:engine run?`);
}

function stopServer() {
  if (!server) return;
  try {
    if (IS_WINDOWS) execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {stdio: 'ignore'});
    else process.kill(-server.pid, 'SIGTERM');
  } catch {
    /* best effort */
  }
  server = null;
}

/* global document, getComputedStyle, Image -- prepareStage runs in the browser, through page.evaluate */

/**
 * In the page: waits for fonts and the stage's art, hides floating overlays, and
 * returns the art that failed to load. A failed <img> still counts as complete,
 * so each is decoded and checked, and CSS backgrounds (the "+N" card back) are
 * probed separately. A stalled request would hold page.evaluate open forever,
 * so the wait rejects after `timeoutMs`.
 */
async function prepareStage(timeoutMs) {
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`fonts or art still loading after ${timeoutMs / 1000} s`)), timeoutMs);
  });
  try {
    return await Promise.race([loadStage(), deadline]);
  } finally {
    clearTimeout(timer);
  }

  async function loadStage() {
    await document.fonts.ready;
    for (const el of document.querySelectorAll('body *')) {
      if (getComputedStyle(el).position === 'fixed' && !el.closest('.banner-stage')) {
        el.style.setProperty('display', 'none', 'important');
      }
    }
    const stage = document.querySelector('.banner-stage');
    const images = [...stage.querySelectorAll('img')];
    await Promise.all(images.map((img) => img.decode().catch(() => undefined)));
    const failed = images.filter((img) => img.naturalWidth === 0).map((img) => img.getAttribute('src') ?? '(no src)');
    const backgrounds = [...stage.querySelectorAll('*')]
      .map((el) => /url\("?([^")]+)"?\)/.exec(getComputedStyle(el).backgroundImage)?.[1])
      .filter(Boolean);
    await Promise.all(
      [...new Set(backgrounds)].map((src) => {
        const probe = new Image();
        probe.src = src;
        return probe.decode().catch(() => failed.push(src));
      }),
    );
    return failed;
  }
}

/** Open one carousel page and wait until it is ready to capture; throws when it can't be. */
async function openPage(page, cardId, p) {
  const url = `${ORIGIN}/banner/${cardId}?page=${p}`;
  await page.goto(url, {waitUntil: 'domcontentloaded', timeout: 45000});
  await page.waitForSelector('.banner-stage, [role="alert"]', {timeout: 45000});
  const alert = await page.$('[role="alert"]');
  if (alert) throw new Error(`${url}: ${await alert.innerText()}`);
  const failed = await page.evaluate(prepareStage, ART_TIMEOUT_MS).catch((e) => {
    throw new Error(`${url}: ${e.message}`, {cause: e});
  });
  if (failed.length) throw new Error(`${url}: art did not load: ${failed.join(', ')}`);
  await page.waitForTimeout(500);
}

/** Screenshot each page's .banner-stage; returns the files written. */
async function capturePages({cardId, pages, slug, outDir}) {
  const {chromium} = await import('playwright');
  const {default: sharp} = await import('sharp');
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1320, height: 1320}, deviceScaleFactor: DSF});
  const written = [];
  try {
    for (let p = 1; p <= pages; p++) {
      await openPage(page, cardId, p);
      const png = await page.locator('.banner-stage').screenshot({type: 'png'});
      const pngPath = path.join(outDir, `${slug}-page-${p}.png`);
      writeFileSync(pngPath, png);
      const fbPath = path.join(outDir, `${slug}-page-${p}-fb2048.jpg`);
      await sharp(png)
        .resize({width: FB_EDGE, height: FB_EDGE, fit: 'inside'})
        .jpeg({quality: 90, chromaSubsampling: '4:4:4'})
        .toFile(fbPath);
      written.push(pngPath, fbPath);
      console.log(`page ${p}/${pages} done`);
    }
  } finally {
    await browser.close();
  }
  return written;
}

async function run(cardId) {
  const ownServer = await ensureServer();
  try {
    const synergies = await getJson(`${ORIGIN}/data/synergies/${cardId}.json`);
    if (!synergies) throw new Error(`inkweave.ink has no precomputed synergies for card ${cardId}. Check the card id.`);
    const pages = pageCountForGroups(synergies.groups.length);

    const allCards = await getJson(`${ORIGIN}/data/allCards.json`);
    const cards = Array.isArray(allCards) ? allCards : (allCards?.cards ?? []);
    const fullName = cards.find((c) => String(c.id) === String(cardId))?.fullName ?? `card-${cardId}`;

    const outDir = path.join(ROOT, 'reports/banners', String(cardId));
    mkdirSync(outDir, {recursive: true});
    const written = await capturePages({cardId, pages, slug: slugFor(fullName), outDir});
    // Only after every page succeeded: the folder then holds exactly this run's set.
    const stale = removeStaleExports(outDir, written);

    console.log(`\n${fullName}: ${pages} page(s), ${synergies.groups.length} synergy groups`);
    for (const f of written) console.log(`  ${Math.round(statSync(f).size / 1024)} KB\t${f}`);
    if (stale.length) console.log(`Removed ${stale.length} file(s) from an earlier export: ${stale.join(', ')}`);
    console.log('\nReddit: the .png files   |   Facebook: the -fb2048.jpg files');
  } finally {
    if (ownServer) stopServer();
  }
}

function main() {
  const cardId = process.argv[2];
  if (!cardId) {
    console.error('Usage: pnpm banner <cardId>   (e.g. pnpm banner 2983)');
    process.exit(1);
  }
  // Ctrl+C or a kill skips run()'s finally: stop the server this run started first.
  for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
    process.once(signal, () => {
      stopServer();
      process.exit(code);
    });
  }
  run(cardId).catch((e) => {
    stopServer();
    console.error(e.message);
    process.exit(1);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
