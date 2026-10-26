#!/usr/bin/env node
// Dependency parity between admin and the pinned app (docs/PLAN.md, section 8).
// Bridged app modules compile inside admin, so admin must (1) declare every
// runtime dependency the app declares, (2) use the app's exact specifier for
// every package both declare and (3) drop a runtime dependency the app no longer
// declares, unless admin's own code needs it. Admin also installs inkweave-ui
// (#101) as a workspace importer, with its dev dependencies, so (4) it declares
// the package's peers and (5) uses the package's specifier for every package
// both declare: a second specifier installs a second copy, and two @types/react
// give tsc two Reacts. A package the app declares too keeps the app's specifier:
// the app's own manifest test holds inkweave-ui to it, so (5) checks only the
// packages the app doesn't declare. Run after each submodule bump; --fix aligns.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ADMIN_PKG = path.join(ROOT, 'package.json');
const APP_PKG = path.join(ROOT, 'upstream/inkweave/apps/web/package.json');
const UI_PKG = path.join(ROOT, 'upstream/inkweave/packages/ui/package.json');

const allDeps = (pkg) => ({...pkg.dependencies, ...pkg.devDependencies});

/** Runtime dependencies admin's own code imports, which it keeps whatever the app declares. */
const ADMIN_OWN_RUNTIME = new Set(['@supabase/supabase-js']);

/**
 * Admin runtime dependencies kept only for parity that the app's runtime set has dropped. A peer
 * of inkweave-ui is never one: admin provides it to the package.
 */
const retiredDeps = (admin, app, ui = {}) =>
  Object.keys(admin.dependencies ?? {}).filter(
    (name) => !(name in (app.dependencies ?? {})) && !(name in (ui.peerDependencies ?? {})) && !ADMIN_OWN_RUNTIME.has(name),
  );

/** Each package admin declares at another specifier than `deps`, the manifest named `owner`, does. */
const mismatches = ({admin, deps, owner}) =>
  Object.entries(allDeps(admin))
    .filter(([name, range]) => name in deps && deps[name] !== range)
    .map(([name, range]) => `version mismatch ${name}: admin ${range}, ${owner} ${deps[name]}`);

/** inkweave-ui's peers that admin doesn't declare as runtime dependencies, each with its peer range. */
const missingPeers = (admin, ui) =>
  Object.entries(ui.peerDependencies ?? {}).filter(([name]) => !(name in (admin.dependencies ?? {})));

/** Human-readable problems; an empty array means admin and the app agree. */
export function compareDeps(admin, app, ui = {}) {
  const adminRuntime = admin.dependencies ?? {};
  const missing = Object.entries(app.dependencies ?? {})
    .filter(([name]) => !(name in adminRuntime))
    .map(([name, range]) => `missing runtime dependency ${name}@${range}`);
  const mismatched = mismatches({admin, deps: allDeps(app), owner: 'app'});
  const retired = retiredDeps(admin, app, ui).map((name) => `runtime dependency ${name} the app no longer declares`);
  return [...missing, ...mismatched, ...retired];
}

/**
 * Human-readable problems between admin and inkweave-ui's manifest; an empty array means they agree.
 * A package `app` declares too is left to compareDeps, as alignDeps leaves it at the app's specifier.
 */
export function comparePackageDeps(admin, ui, app = {}) {
  const appAll = allDeps(app);
  const uiOnly = Object.fromEntries(Object.entries(allDeps(ui)).filter(([name]) => !(name in appAll)));
  const missing = missingPeers(admin, ui).map(([name, range]) => `missing peer dependency ${name}@${range} of inkweave-ui`);
  return [...missing, ...mismatches({admin, deps: uiOnly, owner: 'inkweave-ui'})];
}

/**
 * Admin's dependency maps with every problem compareDeps and comparePackageDeps report fixed, but
 * where the app and inkweave-ui disagree: the app's specifier wins, and inkweave-ui's fills in a
 * package the app doesn't declare.
 */
export function alignDeps(admin, app, ui = {}) {
  const specifiers = {...allDeps(ui), ...allDeps(app)};
  const align = (deps = {}) =>
    Object.fromEntries(Object.entries(deps).map(([name, range]) => [name, specifiers[name] ?? range]));
  const adminRuntime = admin.dependencies ?? {};
  const missing = Object.entries(app.dependencies ?? {}).filter(([name]) => !(name in adminRuntime));
  const retired = new Set(retiredDeps(admin, app, ui));
  const kept = Object.fromEntries(Object.entries(adminRuntime).filter(([name]) => !retired.has(name)));
  const dependencies = align({...kept, ...Object.fromEntries(missingPeers(admin, ui)), ...Object.fromEntries(missing)});
  // A runtime dependency admin had declared as a dev dependency moves, rather than being listed twice.
  const devDependencies = Object.fromEntries(
    Object.entries(align(admin.devDependencies)).filter(([name]) => !(name in dependencies)),
  );
  return {dependencies, devDependencies};
}

function main() {
  const admin = JSON.parse(fs.readFileSync(ADMIN_PKG, 'utf8'));
  const app = JSON.parse(fs.readFileSync(APP_PKG, 'utf8'));
  const ui = JSON.parse(fs.readFileSync(UI_PKG, 'utf8'));

  if (process.argv.includes('--fix')) {
    fs.writeFileSync(ADMIN_PKG, `${JSON.stringify({...admin, ...alignDeps(admin, app, ui)}, null, 2)}\n`);
    console.log('package.json aligned with the app and inkweave-ui. Run pnpm install next.');
    return;
  }

  const problems = [...compareDeps(admin, app, ui), ...comparePackageDeps(admin, ui, app)];
  if (problems.length === 0) {
    console.log('Dependency parity with the app and inkweave-ui: OK');
    return;
  }
  console.error(`Dependency parity with the app and inkweave-ui failed (${problems.length}):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error('Fix with: pnpm check:deps --fix && pnpm install');
  process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
