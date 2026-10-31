#!/usr/bin/env node
/**
 * Returning collectors for admin's Collectors page: counts from the app's
 * `collections` table, written to public/admin-data/collector-analytics.json,
 * which ships inside the login-gated deployment.
 *
 * Reads (build-time only):
 *   - VITE_SUPABASE_URL           the app's Supabase project
 *   - SUPABASE_SERVICE_ROLE_KEY   row-level security lets an account read only its
 *     own collection, so counting every account needs the service role
 *
 * It reads `created_at` and `updated_at` alone (COLLECTOR_COLUMNS), never an account
 * id or a collection's entries, and the file holds counts only. Without the env it
 * writes a file saying the key is missing, and on a failed read one saying so: the
 * page shows why, and the deploy goes on. It exits 1 only when it cannot write the
 * file. Workflow logs are public while the repo is, so it logs the file it wrote and
 * Supabase's error message, never a number.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {collectorArtifact} from './lib/collectorAnalytics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/admin-data');
const OUT_NAME = 'collector-analytics.json';

/** Write the admin-data file, naming it (never its contents) in the log. */
function writeOut(value) {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  fs.writeFileSync(path.join(OUT_DIR, OUT_NAME), JSON.stringify({...value, generatedAt: new Date().toISOString()}));
  console.log(`  wrote public/admin-data/${OUT_NAME}`);
}

async function main() {
  console.log('⚙ Pre-computing collector analytics...');
  const url = process.env.VITE_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) console.warn('  ⚠ VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY absent: writing the no-key file.');
  const client = url && service ? createClient(url, service) : null;
  writeOut(await collectorArtifact({client, now: Date.now()}));
}

main().catch((err) => {
  // collectorArtifact keeps a failed read to its reason, so this is an unexpected
  // error, which must not break a deploy either: write the read-failed file and
  // exit 0. If even that write fails, exit 1, so no deploy ships without the file.
  console.warn(`  ⚠ Collector-analytics precompute failed; writing the read-failed file: ${err.message}`);
  try {
    writeOut({hasData: false, reason: 'read-failed'});
  } catch (writeErr) {
    console.warn(`  ⚠ Could not write the file: ${writeErr.message}`);
    process.exitCode = 1;
  }
});
