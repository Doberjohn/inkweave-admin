#!/usr/bin/env node
// Admin's security model is Vercel login in front of every URL (docs/PLAN.md, D4).
// The deploy workflow runs this against the new deployment and the production
// alias: an anonymous request must be redirected to Vercel login, or the run fails.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const LOGIN_PREFIX = 'https://vercel.com/sso-api';

/** True when an anonymous response is Vercel's login redirect. */
export function isLoginGate(status, location) {
  return (
    (status === 302 || status === 307) &&
    typeof location === 'string' &&
    location.startsWith(LOGIN_PREFIX)
  );
}

async function main(urls) {
  if (urls.length === 0) {
    console.error('usage: node scripts/assert-login-gate.mjs <url> [...url]');
    process.exitCode = 2;
    return;
  }
  let exposed = false;
  for (const url of urls) {
    const response = await fetch(url, {redirect: 'manual'});
    const location = response.headers.get('location');
    const gated = isLoginGate(response.status, location);
    console.log(`${gated ? 'gated  ' : 'EXPOSED'} ${url} -> ${response.status} ${location ?? ''}`);
    if (!gated) exposed = true;
  }
  if (exposed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main(process.argv.slice(2));
}
