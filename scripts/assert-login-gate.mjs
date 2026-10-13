#!/usr/bin/env node
// Admin's security model is Vercel login in front of every URL (docs/PLAN.md, D4).
// The deploy workflow runs this against the new deployment, ADMIN_PRODUCTION_URL
// and every project domain (scripts/vercel-project-urls.mjs): an anonymous request
// must be redirected to Vercel login, or the run fails.
import path from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';

const LOGIN_ORIGIN = 'https://vercel.com';
const LOGIN_PATH = '/sso-api';
const LOGIN_REDIRECTS = new Set([302, 307]);
// Per request: an unresponsive URL fails the check instead of stalling the deploy job.
const REQUEST_TIMEOUT_MS = 30_000;
// A fresh deployment URL can answer 404 for a moment after Vercel reports it ready (Deploy run
// 37453715908, 2026-10-06). A 404 is asked again for a few seconds before it counts as the answer;
// any other status counts at once, so an exposed page still fails on the first request.
const NOT_FOUND_ATTEMPTS = 5;
const NOT_FOUND_DELAY_MS = 2_000;

/** True when an anonymous response is Vercel's login redirect: exactly vercel.com/sso-api. */
export function isLoginGate(status, location) {
  if (!LOGIN_REDIRECTS.has(status) || typeof location !== 'string') return false;
  try {
    const target = new URL(location);
    return target.origin === LOGIN_ORIGIN && target.pathname === LOGIN_PATH;
  } catch {
    return false;
  }
}

/** One anonymous request to `url`, asked again while it answers 404 (see NOT_FOUND_ATTEMPTS). */
export async function fetchGateResponse(url, {fetchFn = fetch, wait = sleep, log = console.log} = {}) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetchFn(url, {redirect: 'manual', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
    if (response.status !== 404 || attempt >= NOT_FOUND_ATTEMPTS) return response;
    log(`retry   ${url} -> 404, asking again in ${NOT_FOUND_DELAY_MS / 1000}s`);
    await wait(NOT_FOUND_DELAY_MS);
  }
}

async function main(urls) {
  if (urls.length === 0) {
    console.error('usage: node scripts/assert-login-gate.mjs <url> [...url]');
    process.exitCode = 2;
    return;
  }
  let failed = false;
  // ADMIN_PRODUCTION_URL is usually one of the project's domains too; check it once.
  for (const url of new Set(urls)) {
    // A URL that can't be checked (empty, unreachable, TLS error) fails the gate,
    // and the remaining URLs are still reported.
    let response;
    try {
      response = await fetchGateResponse(url);
    } catch (error) {
      console.log(`ERROR   ${url || '(empty URL)'} -> ${error.cause?.message ?? error.message}`);
      failed = true;
      continue;
    }
    const location = response.headers.get('location');
    const gated = isLoginGate(response.status, location);
    console.log(`${gated ? 'gated  ' : 'EXPOSED'} ${url} -> ${response.status} ${location ?? ''}`);
    if (!gated) failed = true;
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
