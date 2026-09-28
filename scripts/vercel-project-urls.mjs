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
  let until;
  for (;;) {
    const page = await getPage(until);
    domains.push(...page.domains);
    const next = page.pagination?.next ?? null;
    if (next === null) return domains;
    if (next === until) throw new Error(`domain pagination did not advance past ${until}`);
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

async function main() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`missing environment: ${missing.join(', ')}`);
    process.exitCode = 2;
    return;
  }
  const {VERCEL_TOKEN: token, VERCEL_ORG_ID: teamId, VERCEL_PROJECT_ID: projectId} = process.env;
  const projectPath = `/v9/projects/${encodeURIComponent(projectId)}`;
  const problem = protectionProblem(await vercelGet(projectPath, {teamId}, token));
  if (problem) {
    console.error(problem);
    process.exitCode = 1;
    return;
  }
  const domains = await listDomains((until) =>
    vercelGet(`${projectPath}/domains`, {teamId, limit: PAGE_SIZE, until}, token),
  );
  for (const domain of domains) console.log(`https://${domain.name}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    // An API or network failure must fail the deploy, not skip the check.
    console.error(`vercel-project-urls: ${error.cause?.message ?? error.message}`);
    process.exitCode = 1;
  }
}
