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
 * id, or when the API fails, this writes the empty-but-valid file and exits 0.
 * Workflow logs are public while the repo is, so it logs the file it wrote,
 * never event counts.
 *
 * Docs: https://vercel.com/docs/analytics/web-analytics-api
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  EVENT_QUERIES,
  DEFAULT_BREAKDOWN_LIMIT,
  eventNameFilter,
  breakdownDimension,
  breakdownValueKey,
  reportingWindow,
  resolveWindowDays,
  buildEvent,
  buildVercelAnalytics,
  emptyVercelAnalytics,
} from './lib/vercelAnalytics.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/admin-data');
const OUT_NAME = 'vercel-analytics.json';
const API_BASE = 'https://api.vercel.com/v1/query/web-analytics';

/** Write the admin-data file, naming it (never its contents) in the log. */
function writeArtifact(obj) {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  fs.writeFileSync(path.join(OUT_DIR, OUT_NAME), JSON.stringify({...obj, generatedAt: new Date().toISOString()}));
  console.log(`  wrote public/admin-data/${OUT_NAME}`);
}

/** One authenticated GET against the Web Analytics Query API; returns the `data` field. */
async function vercelQuery(endpoint, params, {token, projectId, teamId}) {
  const search = new URLSearchParams({projectId, ...params});
  if (teamId) search.set('teamId', teamId);
  const res = await fetch(`${API_BASE}/${endpoint}?${search}`, {
    headers: {Authorization: `Bearer ${token}`},
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Vercel API ${endpoint} ${res.status}: ${detail.slice(0, 300)}`);
  }
  const body = await res.json();
  return body.data;
}

/** Pull count + trend + every configured breakdown for one event. */
async function queryEvent(query, window, creds) {
  const filter = eventNameFilter(query.name);
  const count = await vercelQuery('events/count', {filter}, creds);
  const trend = await vercelQuery(
    'events/aggregate',
    {since: window.since, until: window.until, by: 'day', filter},
    creds,
  );
  const breakdowns = [];
  for (const b of query.breakdowns) {
    const rows = await vercelQuery(
      'events/aggregate',
      {
        since: window.since,
        until: window.until,
        by: breakdownDimension(b),
        filter,
        limit: String(b.limit ?? DEFAULT_BREAKDOWN_LIMIT),
      },
      creds,
    );
    breakdowns.push({prop: b.prop, label: b.label, valueKey: breakdownValueKey(b), numeric: b.numeric, rows});
  }
  return buildEvent({name: query.name, label: query.label, count, trend, breakdowns});
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

  const events = [];
  for (const query of EVENT_QUERIES) {
    events.push(await queryEvent(query, window, creds));
  }
  writeArtifact(buildVercelAnalytics({events, window}));
}

main().catch((err) => {
  // A web-analytics tab must never break a deploy. Log loudly, write the empty
  // file so the tab shows its no-data state, and exit 0.
  console.warn(`  ⚠ Vercel-analytics precompute failed; writing the empty file: ${err.message}`);
  try {
    writeArtifact(emptyVercelAnalytics());
  } catch (writeErr) {
    console.warn(`  ⚠ Could not write the empty file: ${writeErr.message}`);
  }
});
