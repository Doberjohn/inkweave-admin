#!/usr/bin/env node
// Admin's security model is Vercel login in front of every URL (docs/PLAN.md, D4).
// Standard Protection leaves production domains public, inkweave-admin.vercel.app
// included, so this fails unless the project uses All Deployments. It then prints
// the https:// URL of every project domain, so the deploy's gate check covers
// domains that nobody listed by hand. Needs VERCEL_TOKEN, VERCEL_ORG_ID and
// VERCEL_PROJECT_ID, like the Vercel CLI steps in deploy.yml.
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const API = 'https://api.vercel.com';
const ALL_DEPLOYMENTS = 'all';
// The API's maximum; `pagination.next` pages through the rest.
const PAGE_SIZE = 100;
const REQUEST_TIMEOUT_MS = 30_000;
const REQUIRED_ENV = ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'];

/** Why the project's URLs aren't all behind Vercel login, or null when they are. */
export function protectionProblem(project) {
  const mode = project?.ssoProtection?.deploymentType ?? 'off';
  if (mode === ALL_DEPLOYMENTS) return null;
  return (
    `Deployment Protection is "${mode}", not All Deployments ("${ALL_DEPLOYMENTS}"), ` +
    'so production domains can be public. Fix it in Vercel: Security, Deployment Protection.'
  );
}

/**
 * Every domain across all pages. `getPage(until)` returns one page of the domains
 * API: `until` is undefined first, then the previous page's `pagination.next`.
 */
export async function listDomains(getPage) {
  const domains = [];
  // A cursor seen before means the pages cycle; failing beats hanging the deploy.
  const seen = new Set();
  let until;
  for (;;) {
    const page = await getPage(until);
    domains.push(...page.domains);
    // The API always sends pagination.next, and null marks the last page. A page
    // without it can't be trusted, so fail instead of checking fewer domains.
    const next = page.pagination?.next;
    if (next === undefined) throw new Error('domains response has no pagination.next');
    if (next === null) return domains;
    if (seen.has(next)) throw new Error(`domain pagination repeated cursor ${next}`);
    seen.add(next);
    until = next;
  }
}

async function vercelGet(pathname, params, token) {
  const url = new URL(pathname, API);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    headers: {Authorization: `Bearer ${token}`},
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(`GET ${pathname} -> ${response.status} ${body.error?.message ?? response.statusText}`);
  }
  return response.json();
}

const failure = (exitCode, error) => ({exitCode, urls: [], error});

/**
 * The whole check except printing. `get(pathname, params, token)` resolves to the
 * Vercel API's JSON. URLs come back only when the project uses All Deployments;
 * every failure is a non-zero exit code with no URLs, never a skipped check.
 */
export async function run(env, get) {
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length > 0) return failure(2, `missing environment: ${missing.join(', ')}`);
  const {VERCEL_TOKEN: token, VERCEL_ORG_ID: teamId, VERCEL_PROJECT_ID: projectId} = env;
  try {
    const projectPath = `/v9/projects/${encodeURIComponent(projectId)}`;
    const problem = protectionProblem(await get(projectPath, {teamId}, token));
    if (problem) return failure(1, problem);
    const domains = await listDomains((until) =>
      get(`${projectPath}/domains`, {teamId, limit: PAGE_SIZE, until}, token),
    );
    return {exitCode: 0, urls: domains.map((domain) => `https://${domain.name}`), error: null};
  } catch (error) {
    return failure(1, error.cause?.message ?? error.message);
  }
}

/**
 * Prints each URL on its own stdout line, which deploy.yml reads, and any error
 * on stderr. Returns the exit code.
 */
export async function main(env, get) {
  const {exitCode, urls, error} = await run(env, get);
  for (const url of urls) console.log(url);
  if (error) console.error(`vercel-project-urls: ${error}`);
  return exitCode;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.env, vercelGet);
}
