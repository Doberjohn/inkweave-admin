#!/usr/bin/env node
// Admin's security model is Vercel login in front of every URL (docs/PLAN.md, D4).
// The deploy workflow runs this against the new deployment and the production
// alias: an anonymous request must be redirected to Vercel login, or the run fails.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const LOGIN_ORIGIN = 'https://vercel.com';
const LOGIN_PATH = '/sso-api';

/** True when an anonymous response is Vercel's login redirect: exactly vercel.com/sso-api. */
export function isLoginGate(status, location) {
  if ((status !== 302 && status !== 307) || typeof location !== 'string') return false;
  try {
    const target = new URL(location);
    return target.origin === LOGIN_ORIGIN && target.pathname === LOGIN_PATH;
  } catch {
    return false;
  }
}

async function main(urls) {
  if (urls.length === 0) {
    console.error('usage: node scripts/assert-login-gate.mjs <url> [...url]');
    process.exitCode = 2;
    return;
  }
  let failed = false;
  for (const url of urls) {
    // A URL that can't be checked (empty, unreachable, TLS error) fails the gate,
    // and the remaining URLs are still reported.
    let response;
    try {
      response = await fetch(url, {redirect: 'manual'});
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
