#!/usr/bin/env node
// Dependency parity between admin and the pinned app (docs/PLAN.md, section 8).
// Bridged app modules compile inside admin, so admin must (1) declare every
// runtime dependency the app declares, (2) use the app's exact specifier for
// every package both declare and (3) drop a runtime dependency the app no longer
// declares, unless admin's own code needs it. Run after each submodule bump;
// --fix aligns.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_PKG = path.join(ROOT, 'package.json');
const APP_PKG = path.join(ROOT, 'upstream/inkweave/apps/web/package.json');

const allDeps = (pkg) => ({...pkg.dependencies, ...pkg.devDependencies});

/** Runtime dependencies admin's own code imports, which it keeps whatever the app declares. */
const ADMIN_OWN_RUNTIME = new Set(['@supabase/supabase-js']);

/** Admin runtime dependencies kept only for parity that the app's runtime set has dropped. */
const retiredDeps = (admin, app) =>
  Object.keys(admin.dependencies ?? {}).filter(
    (name) => !(name in (app.dependencies ?? {})) && !ADMIN_OWN_RUNTIME.has(name),
  );

/** Human-readable problems; an empty array means admin and the app agree. */
export function compareDeps(admin, app) {
  const adminRuntime = admin.dependencies ?? {};
  const appAll = allDeps(app);
  const missing = Object.entries(app.dependencies ?? {})
    .filter(([name]) => !(name in adminRuntime))
    .map(([name, range]) => `missing runtime dependency ${name}@${range}`);
  const mismatched = Object.entries(allDeps(admin))
    .filter(([name, range]) => name in appAll && appAll[name] !== range)
    .map(([name, range]) => `version mismatch ${name}: admin ${range}, app ${appAll[name]}`);
  const retired = retiredDeps(admin, app).map((name) => `runtime dependency ${name} the app no longer declares`);
  return [...missing, ...mismatched, ...retired];
}

/** Admin's dependency maps with every problem compareDeps reports fixed. */
export function alignDeps(admin, app) {
  const appAll = allDeps(app);
  const align = (deps = {}) =>
    Object.fromEntries(Object.entries(deps).map(([name, range]) => [name, appAll[name] ?? range]));
  const adminRuntime = admin.dependencies ?? {};
  const missing = Object.entries(app.dependencies ?? {}).filter(([name]) => !(name in adminRuntime));
  const retired = new Set(retiredDeps(admin, app));
  const kept = Object.fromEntries(Object.entries(adminRuntime).filter(([name]) => !retired.has(name)));
  const dependencies = {...align(kept), ...Object.fromEntries(missing)};
  // A runtime dependency admin had declared as a dev dependency moves, rather than being listed twice.
  const devDependencies = Object.fromEntries(
    Object.entries(align(admin.devDependencies)).filter(([name]) => !(name in dependencies)),
  );
  return {dependencies, devDependencies};
}

function main() {
  const admin = JSON.parse(fs.readFileSync(ADMIN_PKG, 'utf8'));
  const app = JSON.parse(fs.readFileSync(APP_PKG, 'utf8'));

  if (process.argv.includes('--fix')) {
    fs.writeFileSync(ADMIN_PKG, `${JSON.stringify({...admin, ...alignDeps(admin, app)}, null, 2)}\n`);
    console.log('package.json aligned with the app. Run pnpm install next.');
    return;
  }

  const problems = compareDeps(admin, app);
  if (problems.length === 0) {
    console.log('Dependency parity with the app: OK');
    return;
  }
  console.error(`Dependency parity with the app failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('Fix with: pnpm check:deps --fix && pnpm install');
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
