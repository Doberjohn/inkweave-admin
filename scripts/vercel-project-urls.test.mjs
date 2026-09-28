// @vitest-environment node
import {describe, expect, it} from 'vitest';
import {listDomains, protectionProblem} from './vercel-project-urls.mjs';

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
