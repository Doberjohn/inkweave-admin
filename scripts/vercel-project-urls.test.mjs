// @vitest-environment node
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {listDomains, main, protectionProblem, run} from './vercel-project-urls.mjs';

describe('protectionProblem', () => {
  it('accepts All Deployments', () => {
    expect(protectionProblem({ssoProtection: {deploymentType: 'all'}})).toBeNull();
  });

  it('rejects Standard Protection, which leaves production domains public', () => {
    expect(protectionProblem({ssoProtection: {deploymentType: 'all_except_custom_domains'}})).toMatch(
      /"all_except_custom_domains", not All Deployments/,
    );
  });

  it('rejects a project with protection turned off', () => {
    expect(protectionProblem({ssoProtection: null})).toMatch(/"off", not All Deployments/);
  });

  it('rejects a response without a protection setting', () => {
    expect(protectionProblem({})).toMatch(/"off", not All Deployments/);
    expect(protectionProblem(undefined)).toMatch(/"off", not All Deployments/);
  });
});

describe('listDomains', () => {
  it('follows pagination.next until the last page', async () => {
    const pages = new Map([
      [undefined, {domains: [{name: 'inkweave-admin.vercel.app'}], pagination: {next: 1700}}],
      [1700, {domains: [{name: 'admin.example.com'}], pagination: {next: null}}],
    ]);
    const requested = [];
    const domains = await listDomains(async (until) => {
      requested.push(until);
      return pages.get(until);
    });
    expect(domains.map((domain) => domain.name)).toEqual(['inkweave-admin.vercel.app', 'admin.example.com']);
    expect(requested).toEqual([undefined, 1700]);
  });

  it('stops after one page when the response has no pagination', async () => {
    const domains = await listDomains(async () => ({domains: [{name: 'inkweave-admin.vercel.app'}]}));
    expect(domains.map((domain) => domain.name)).toEqual(['inkweave-admin.vercel.app']);
  });

  it('fails instead of looping when a page repeats its cursor', async () => {
    const repeating = async () => ({domains: [], pagination: {next: 1700}});
    await expect(listDomains(repeating)).rejects.toThrow('repeated cursor 1700');
  });

  it('fails instead of looping when pages cycle between cursors', async () => {
    const cycling = async (until) => ({domains: [], pagination: {next: until === 1700 ? 1701 : 1700}});
    await expect(listDomains(cycling)).rejects.toThrow('repeated cursor 1700');
  });
});

const env = {VERCEL_TOKEN: 'token', VERCEL_ORG_ID: 'team_x', VERCEL_PROJECT_ID: 'prj_x'};
const onePage = [{domains: [{name: 'inkweave-admin.vercel.app'}], pagination: {next: null}}];

// Serves the project, then `domainPages` in order, and records every call.
const fakeApi = ({deploymentType = 'all', error, domainPages = onePage} = {}) => {
  const requested = [];
  const pages = [...domainPages];
  const get = async (pathname, params, token) => {
    requested.push({pathname, params, token});
    if (error) throw new Error(error);
    return pathname.endsWith('/domains') ? pages.shift() : {ssoProtection: {deploymentType}};
  };
  return {get, requested};
};

// deploy.yml trusts the exit code and prints whatever URLs come back, so every
// failure must be non-zero with no URLs.
describe('run', () => {
  it('lists every domain when the project uses All Deployments', async () => {
    const {get} = fakeApi();
    expect(await run(env, get)).toEqual({exitCode: 0, urls: ['https://inkweave-admin.vercel.app'], error: null});
  });

  it('passes the team, page size, cursor and token to every API call', async () => {
    const {get, requested} = fakeApi({
      domainPages: [
        {domains: [{name: 'inkweave-admin.vercel.app'}], pagination: {next: 1700}},
        {domains: [{name: 'admin.example.com'}], pagination: {next: null}},
      ],
    });
    expect((await run(env, get)).urls).toEqual(['https://inkweave-admin.vercel.app', 'https://admin.example.com']);
    expect(requested).toEqual([
      {pathname: '/v9/projects/prj_x', params: {teamId: 'team_x'}, token: 'token'},
      {pathname: '/v9/projects/prj_x/domains', params: {teamId: 'team_x', limit: 100, until: undefined}, token: 'token'},
      {pathname: '/v9/projects/prj_x/domains', params: {teamId: 'team_x', limit: 100, until: 1700}, token: 'token'},
    ]);
  });

  it('exits 2 without calling the API when the environment is incomplete', async () => {
    const {get, requested} = fakeApi();
    expect(await run({VERCEL_ORG_ID: 'team_x'}, get)).toEqual({
      exitCode: 2,
      urls: [],
      error: 'missing environment: VERCEL_TOKEN, VERCEL_PROJECT_ID',
    });
    expect(requested).toEqual([]);
  });

  it('exits 1 without asking for domains when protection is not All Deployments', async () => {
    const {get, requested} = fakeApi({deploymentType: 'all_except_custom_domains'});
    expect(await run(env, get)).toMatchObject({exitCode: 1, urls: []});
    expect(requested.map((call) => call.pathname)).toEqual(['/v9/projects/prj_x']);
  });

  it('exits 1 with no URLs when the API fails', async () => {
    const {get} = fakeApi({error: 'GET /v9/projects/prj_x -> 403 Not authorized'});
    expect(await run(env, get)).toEqual({exitCode: 1, urls: [], error: 'GET /v9/projects/prj_x -> 403 Not authorized'});
  });
});

// deploy.yml reads stdout line by line into the URL list the gate checks.
describe('main', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prints one URL per line on stdout and nothing on stderr', async () => {
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {get} = fakeApi({
      domainPages: [
        {domains: [{name: 'inkweave-admin.vercel.app'}, {name: 'admin.example.com'}], pagination: {next: null}},
      ],
    });
    expect(await main(env, get)).toBe(0);
    expect(stdout.mock.calls).toEqual([['https://inkweave-admin.vercel.app'], ['https://admin.example.com']]);
    expect(stderr).not.toHaveBeenCalled();
  });

  it('prints nothing on stdout when the check fails', async () => {
    const stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
    const stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const {get} = fakeApi({deploymentType: 'all_except_custom_domains'});
    expect(await main(env, get)).toBe(1);
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledTimes(1);
  });
});

describe('command line', () => {
  it('exits 2 and prints no URL when the environment is incomplete', () => {
    const script = fileURLToPath(new URL('./vercel-project-urls.mjs', import.meta.url));
    const childEnv = {...process.env};
    for (const name of ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID']) delete childEnv[name];
    const result = spawnSync(process.execPath, [script], {env: childEnv, encoding: 'utf8'});
    expect(result.status).toBe(2);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('missing environment');
  });
});
