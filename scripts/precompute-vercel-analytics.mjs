#!/usr/bin/env node
/**
 * Web Analytics for the admin analytics tool (docs/PLAN.md, D8). Queries the
 * Vercel Web Analytics Query API for the custom events in EVENT_QUERIES and
 * writes public/admin-data/vercel-analytics.json, which the tool reads behind
 * the admin login.
 *
 * Reads (build-time only; never VITE_-prefixed, so they can't reach the bundle):
 *   - VERCEL_ANALYTICS_TOKEN        Vercel access token with read scope (required)
 *   - ANALYTICS_VERCEL_PROJECT_ID   prj_… of the app's Vercel project (required).
 *     Not VERCEL_PROJECT_ID: in the deploy workflow that names admin's own project.
 *   - ANALYTICS_VERCEL_TEAM_ID      team_… that owns it (optional; omit for a
 *     personal-account project)
 *   - VERCEL_ANALYTICS_WINDOW_DAYS  lookback in days (optional, default 60, at most 62)
 *
 * A web-analytics tab is not worth a failed deploy: without the token or project
 * id this writes the empty-but-valid file and exits 0. An event whose requests fail
 * is left out of the file and named in its `unavailable`, so one failure costs that
 * event alone; an unexpected error names every event there. It exits 1 only when
 * it cannot write the file. Workflow logs are public while the repo is, so it logs
 * the file it wrote and each failed event's endpoint and HTTP status: never a count,
 * a response body, or how many requests it made, which says which events were sent.
 *
 * Docs: https://vercel.com/docs/analytics/web-analytics-api
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  EVENT_QUERIES,
  collectEvents,
  reportingWindow,
  resolveWindowDays,
  buildVercelAnalytics,
  emptyVercelAnalytics,
  failedRunAnalytics,
} from './lib/vercelAnalytics.mjs';
import {vercelQuery} from './lib/vercelQuery.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/admin-data');
const OUT_NAME = 'vercel-analytics.json';

/** Write the admin-data file, naming it (never its contents) in the log. */
function writeArtifact(obj) {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  fs.writeFileSync(path.join(OUT_DIR, OUT_NAME), JSON.stringify({...obj, generatedAt: new Date().toISOString()}));
  console.log(`  wrote public/admin-data/${OUT_NAME}`);
}

async function main() {
  console.log('⚙ Pre-computing Vercel Web Analytics...');
  const token = process.env.VERCEL_ANALYTICS_TOKEN;
  const projectId = process.env.ANALYTICS_VERCEL_PROJECT_ID;
  const teamId = process.env.ANALYTICS_VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.warn('  ⚠ VERCEL_ANALYTICS_TOKEN / ANALYTICS_VERCEL_PROJECT_ID absent: writing the empty file.');
    writeArtifact(emptyVercelAnalytics());
    return;
  }

  const days = resolveWindowDays(process.env.VERCEL_ANALYTICS_WINDOW_DAYS);
  const window = reportingWindow(new Date(), days);
  const creds = {token, projectId, teamId};

  const ask = (endpoint, params) => vercelQuery(endpoint, params, creds);
  const {events, failures} = await collectEvents(EVENT_QUERIES, window, ask);
  // The messages name an endpoint and a status (vercelQuery), never a count or a body.
  for (const failure of failures) console.warn(`  ⚠ left out ${failure.name}: ${failure.message}`);
  writeArtifact(buildVercelAnalytics({events, window, unavailable: failures.map((failure) => failure.name)}));
}

main().catch((err) => {
  // collectEvents keeps each API failure to its event, so this is an unexpected
  // error, which must not break a deploy either: log it, write a file naming every
  // event unavailable, so the tab says the read failed, and exit 0. If even that
  // write fails, exit 1, so no deploy ships without the file.
  console.warn(`  ⚠ Vercel-analytics precompute failed; writing every event as unavailable: ${err.message}`);
  try {
    writeArtifact(failedRunAnalytics(EVENT_QUERIES));
  } catch (writeErr) {
    console.warn(`  ⚠ Could not write the file: ${writeErr.message}`);
    process.exitCode = 1;
  }
});
