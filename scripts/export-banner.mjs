#!/usr/bin/env node
// Synergy Spotlight banner exporter (docs/BANNER.md). Given a card id, renders
// every carousel page of its synergy breakdown through admin's /banner/:cardId
// route and writes shareable images to reports/banners/<id>/:
//   - <slug>-page-N.png         full-res 3600x3720 lossless  (Reddit)
//   - <slug>-page-N-fb2048.jpg  2048px wide, 4:4:4 JPEG      (Facebook)
//
// Reuses an admin dev server already on :5180, otherwise starts a throwaway one
// and stops it afterwards. Card data and synergies come through that server's
// /data/ forward, so the images match what inkweave.ink serves.
// Usage: pnpm banner <cardId>        e.g. pnpm banner 2983
import {execFileSync, spawn} from 'node:child_process';
import {mkdirSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Mirror BannerPage.tsx: at most MAX_GROUPS synergies shown, ROWS_PER_PAGE rows per page.
const MAX_GROUPS = 6;
const ROWS_PER_PAGE = 3;
const PORT = 5180;
const ORIGIN = `http://localhost:${PORT}`;
const DSF = 3; // deviceScaleFactor -> 1200x1240 stage renders at 3600x3720
const FB_WIDTH = 2048;

/**
 * How many carousel pages to render for a card with `groupCount` synergy groups.
 * Must match BannerPage's slicing (MAX_GROUPS shown, ROWS_PER_PAGE per page) so the
 * export renders exactly the pages the route produces, never a blank or repeated one.
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

/** JSON from the dev server, or null when the file is missing (the SPA fallback answers with HTML). */
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return null;
  return res.json();
}

async function serverUp() {
  try {
    return (await fetch(`${ORIGIN}/`)).ok;
  } catch {
    return false;
  }
}

let server = null;

/** True when this run started the server (and so must stop it). */
async function ensureServer() {
  if (await serverUp()) return false;
  console.log(`Starting a throwaway admin dev server on :${PORT} …`);
  server = spawn('pnpm', ['exec', 'vite'], {cwd: ROOT, shell: true, stdio: 'ignore'});
  for (let i = 0; i < 60; i++) {
    if (await serverUp()) return true;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`The dev server did not come up on :${PORT} within 60s. Has pnpm build:engine run?`);
}

function stopServer() {
  if (!server) return;
  try {
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], {stdio: 'ignore'});
    else server.kill('SIGTERM');
  } catch {
    /* best effort */
  }
}

/* global document, getComputedStyle -- the page.evaluate callback below runs in the browser */

/** Screenshot each page's .banner-stage; returns the files written. */
async function capturePages({cardId, pages, slug, outDir}) {
  const {chromium} = await import('playwright');
  const {default: sharp} = await import('sharp');
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport: {width: 1320, height: 1320}, deviceScaleFactor: DSF});
  const written = [];
  try {
    for (let p = 1; p <= pages; p++) {
      await page.goto(`${ORIGIN}/banner/${cardId}?page=${p}`, {waitUntil: 'domcontentloaded', timeout: 45000});
      await page.waitForSelector('.banner-stage', {timeout: 45000});
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          [...document.images].map((img) => (img.complete ? null : new Promise((res) => (img.onload = img.onerror = res)))),
        );
        for (const el of document.querySelectorAll('body *')) {
          const s = getComputedStyle(el);
          if (s.position === 'fixed' && !el.closest('.banner-stage')) el.style.setProperty('display', 'none', 'important');
        }
      });
      await page.waitForTimeout(500);
      const png = await page.locator('.banner-stage').screenshot({type: 'png'});
      const pngPath = path.join(outDir, `${slug}-page-${p}.png`);
      writeFileSync(pngPath, png);
      const fbPath = path.join(outDir, `${slug}-page-${p}-fb2048.jpg`);
      await sharp(png).resize({width: FB_WIDTH}).jpeg({quality: 90, chromaSubsampling: '4:4:4'}).toFile(fbPath);
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

    console.log(`\n${fullName}: ${pages} page(s), ${synergies.groups.length} synergy groups`);
    for (const f of written) console.log(`  ${Math.round(statSync(f).size / 1024)} KB\t${f}`);
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
  run(cardId).catch((e) => {
    stopServer();
    console.error(e.message);
    process.exit(1);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
