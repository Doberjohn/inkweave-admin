/**
 * AVIFs from official scans, made by the app's own converter
 * (upstream/inkweave/scripts/convert-preview-images.mjs), so admin never drifts from the
 * sizes and quality the app ships. It converts beside itself and upstream/ is read-only, so
 * it runs from a copy in a scratch folder inside admin, where `sharp` resolves from admin's
 * node_modules. Copying a file from upstream is fine; importing from it is the bridge's job.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {ROOT} from './web.mjs';

const CONVERTER = path.join(ROOT, 'upstream/inkweave/scripts/convert-preview-images.mjs');
/** The two variants the app ships, and only shows together. */
export const VARIANTS = ['', '-sm'];

/** A run's scratch copy of the converter's layout. */
export function scratchFor(runId) {
  const root = path.join(ROOT, '.reveal-sync-convert', runId);
  return {
    root,
    script: path.join(root, 'scripts/convert-preview-images.mjs'),
    raw: path.join(root, 'apps/web/public/card-images-raw'),
    out: path.join(root, 'apps/web/public/card-images-preview'),
  };
}

export function removeScratch(runId) {
  fs.rmSync(scratchFor(runId).root, {recursive: true, force: true});
}

/**
 * Convert each {id, source} scan. Returns the converter's exit code, and the ids whose two
 * AVIFs exist afterwards, each with its files as [{name, path}]. The files stay in the
 * scratch folder until removeScratch.
 */
export function convertScans(runId, scans) {
  if (!scans.length) return {exitCode: 0, made: []};
  const scratch = scratchFor(runId);
  removeScratch(runId);
  fs.mkdirSync(scratch.raw, {recursive: true});
  fs.mkdirSync(path.dirname(scratch.script), {recursive: true});
  fs.copyFileSync(CONVERTER, scratch.script);
  for (const {id, source} of scans) {
    fs.copyFileSync(source, path.join(scratch.raw, `${id}${path.extname(source)}`));
  }
  const result = spawnSync(process.execPath, [scratch.script], {cwd: scratch.root, stdio: 'inherit'});
  const avifs = (id) =>
    VARIANTS.map((suffix) => ({name: `${id}${suffix}.avif`, path: path.join(scratch.out, `${id}${suffix}.avif`)}));
  const made = scans
    .map(({id}) => ({id, files: avifs(id)}))
    .filter(({files}) => files.every((file) => fs.existsSync(file.path)));
  return {exitCode: result.error ? -1 : result.status, made};
}
