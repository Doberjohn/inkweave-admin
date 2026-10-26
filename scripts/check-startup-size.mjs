#!/usr/bin/env node
// Admin's startup budget and stylesheet urls (#101). Run after `pnpm build`.
// Startup is the JavaScript dist/index.html loads: its module script and any
// modulepreloads. It must stay one file within BUDGET, gzipped at level 9 as
// the shared component library's study measured it, and no other script may
// ship unless LAZY_CHUNKS names it: a bridged app module that warms a lazy
// chunk ships that chunk too, which the bridge's own checks can't see. Every url() in the built
// CSS must name a file the build wrote (public/ included), or a path forwarded
// to inkweave.ink (forwarded-paths.json), unless it names no file at all, as
// the app's cssUrlGuard reads urls: Vite only warns on a stylesheet url it
// can't resolve and ships it as written, so a moved symbol draws nothing.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

/** main's startup (312,041 B at app pin 1c418ff) plus 1%, rounded up to the next 1,000 B. */
export const BUDGET = {files: 1, gzipBytes: 316_000};

/** The scripts admin may ship outside startup, by chunk name. */
export const LAZY_CHUNKS = ['CardOverviewModal']; // the app CardTile's modal warm-up, until Doberjohn/inkweave-admin#102

const TAG = /<(script|link)\b[^>]*>/g;
const ATTR = /\b([\w-]+)="([^"]*)"/g;
const ASSET_JS = /^\/assets\/.+\.js$/;
const CSS_URL = /url\(\s*(['"]?)(.*?)\1\s*\)/g;
// Urls no file of the build backs, as the app's cssUrlGuard has them: a scheme (data: among them),
// another origin, or a fragment reference.
const NOT_A_FILE = /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i;

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

/** A built script's chunk name: its file name without Rolldown's 8-character hash. */
export const chunkName = (file) => file.replace(/-[\w-]{8}\.js$/, '');

/** The .js files in dist/assets (`assets`, bare names) that startup doesn't load and `allowed` doesn't name, sorted. */
export function strayScripts({html, assets, allowed = LAZY_CHUNKS}) {
  const startup = new Set(startupScripts(html));
  return assets
    .filter((file) => file.endsWith('.js') && !startup.has(`/assets/${file}`) && !allowed.includes(chunkName(file)))
    .sort();
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

/** The site path a url names: one relative to the stylesheet resolves against its folder. */
const sitePath = ({url, sheet}) => path.posix.resolve(path.posix.dirname(sheet), url.replace(/[?#].*$/, ''));

/**
 * Each url() in the stylesheet at site path `sheet` that names a file, but neither a built one
 * (`emitted` holds their site paths) nor one under a forwarded prefix.
 */
export function cssUrlProblems({css, sheet, emitted, forwarded}) {
  const resolves = (url) => {
    const file = sitePath({url, sheet});
    return emitted.has(file) || forwarded.some((prefix) => file.startsWith(prefix));
  };
  const urls = [...new Set([...css.matchAll(CSS_URL)].map((match) => match[2]))];
  return urls
    .filter((url) => !NOT_A_FILE.test(url) && !resolves(url))
    .map((url) => `url(${url}) names no built file or forwarded path`);
}

/** Every file dist/ holds, by its site path ("/assets/x.css", "/favicon.svg"). */
const builtFiles = () =>
  fs
    .readdirSync(DIST, {recursive: true, withFileTypes: true})
    .filter((entry) => entry.isFile())
    .map((entry) => `/${path.relative(DIST, path.join(entry.parentPath, entry.name)).split(path.sep).join('/')}`);

function stylesheetProblems() {
  const files = builtFiles();
  const emitted = new Set(files);
  const {paths: forwarded} = JSON.parse(fs.readFileSync(path.join(ROOT, 'forwarded-paths.json'), 'utf8'));
  return files
    .filter((sheet) => sheet.endsWith('.css'))
    .flatMap((sheet) => {
      const css = fs.readFileSync(path.join(DIST, sheet), 'utf8');
      return cssUrlProblems({css, sheet, emitted, forwarded}).map((problem) => `${sheet.slice(1)}: ${problem}`);
    });
}

/** Each script outside startup that LAZY_CHUNKS doesn't name, with its size gzipped. */
function strayProblems(html) {
  const assets = fs.readdirSync(path.join(DIST, 'assets'));
  const outside = strayScripts({html, assets, allowed: []});
  console.log(`Scripts outside startup: ${outside.length > 0 ? outside.join(', ') : 'none'}`);
  return strayScripts({html, assets}).map((file) => {
    const gzipBytes = zlib.gzipSync(fs.readFileSync(path.join(DIST, 'assets', file)), {level: 9}).length;
    return `${file} (${gzipBytes} B gzipped) loads after startup, and LAZY_CHUNKS doesn't name "${chunkName(file)}"`;
  });
}

function main() {
  const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  const measured = measureStartup({html, readAsset: (file) => fs.readFileSync(path.join(DIST, file))});
  console.log(`Startup JavaScript: ${measured.files} file(s), ${measured.gzipBytes} B gzipped`);
  const problems = [...sizeProblems(measured, BUDGET), ...strayProblems(html), ...stylesheetProblems()];
  if (problems.length === 0) {
    console.log(`Startup size and stylesheet urls: OK (budget ${BUDGET.gzipBytes} B)`);
    return;
  }
  console.error(`Startup check failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
