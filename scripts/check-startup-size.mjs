#!/usr/bin/env node
// Admin's startup budget and stylesheet urls (#101). Run after `pnpm build`.
// Startup is the JavaScript dist/index.html loads: its module script and any
// modulepreloads. It must stay one file within BUDGET, gzipped at level 9 as
// the shared component library's study measured it. Every url() in the built
// CSS must name a file the build wrote, a data: URI or a path forwarded to
// inkweave.ink (forwarded-paths.json): Vite only warns on a stylesheet url it
// can't resolve and ships it as written, so a moved symbol draws nothing.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

/** main's startup (312,041 B at app pin 1c418ff) plus 1%, rounded up to the next 1,000 B. */
export const BUDGET = {files: 1, gzipBytes: 316_000};

const TAG = /<(script|link)\b[^>]*>/g;
const ATTR = /\b([\w-]+)="([^"]*)"/g;
const ASSET_JS = /^\/assets\/.+\.js$/;
const CSS_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/g;

/** What a <script> or <link> tag starts loading: a module script's src, or a modulepreload's href. */
function loadedBy([tag, kind]) {
  const attrs = Object.fromEntries([...tag.matchAll(ATTR)].map(([, name, value]) => [name, value]));
  if (kind === 'script') return attrs.type === 'module' ? attrs.src : undefined;
  return attrs.rel === 'modulepreload' ? attrs.href : undefined;
}

/** The /assets/*.js files index.html loads at startup, each once. */
export function startupScripts(html) {
  const files = [...html.matchAll(TAG)].map(loadedBy).filter((file) => ASSET_JS.test(file ?? ''));
  return [...new Set(files)];
}

/** How many startup JS files there are, and their size gzipped at level 9. */
export function measureStartup({html, readAsset}) {
  const files = startupScripts(html);
  const gzipBytes = files.reduce((sum, file) => sum + zlib.gzipSync(readAsset(file), {level: 9}).length, 0);
  return {files: files.length, gzipBytes};
}

/** Each way the measured startup breaks the budget. */
export function sizeProblems(measured, budget) {
  return [
    ...(measured.files > budget.files ? [`startup loads ${measured.files} JS files, budget ${budget.files}`] : []),
    ...(measured.gzipBytes > budget.gzipBytes
      ? [`startup JS is ${measured.gzipBytes} B gzipped, over the ${budget.gzipBytes} B budget`]
      : []),
  ];
}

/**
 * Each url() in a stylesheet that is neither a data: URI or fragment reference, nor a built
 * /assets/ file (`emitted` holds their paths), nor under a forwarded prefix.
 */
export function cssUrlProblems({css, emitted, forwarded}) {
  const resolves = (url) => {
    const file = url.replace(/[?#].*$/, '');
    return emitted.has(file) || forwarded.some((prefix) => file.startsWith(prefix));
  };
  const urls = [...new Set([...css.matchAll(CSS_URL)].map((match) => match[2]))];
  return urls
    .filter((url) => !/^(data:|#)/.test(url) && !resolves(url))
    .map((url) => `url(${url}) names no built file or forwarded path`);
}

function stylesheetProblems() {
  const assets = fs.readdirSync(path.join(DIST, 'assets'));
  const emitted = new Set(assets.map((name) => `/assets/${name}`));
  const {paths: forwarded} = JSON.parse(fs.readFileSync(path.join(ROOT, 'forwarded-paths.json'), 'utf8'));
  return assets
    .filter((name) => name.endsWith('.css'))
    .flatMap((name) => {
      const css = fs.readFileSync(path.join(DIST, 'assets', name), 'utf8');
      return cssUrlProblems({css, emitted, forwarded}).map((problem) => `assets/${name}: ${problem}`);
    });
}

function main() {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const measured = measureStartup({html, readAsset: (file) => fs.readFileSync(path.join(DIST, file))});
  console.log(`Startup JavaScript: ${measured.files} file(s), ${measured.gzipBytes} B gzipped`);
  const problems = [...sizeProblems(measured, BUDGET), ...stylesheetProblems()];
  if (problems.length === 0) {
    console.log(`Startup size and stylesheet urls: OK (budget ${BUDGET.gzipBytes} B)`);
    return;
  }
  console.error(`Startup check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
