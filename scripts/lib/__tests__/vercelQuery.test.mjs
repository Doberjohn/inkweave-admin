// @vitest-environment node
import {afterEach, describe, expect, it, vi} from 'vitest';
import {vercelQuery} from '../vercelQuery.mjs';

const CREDS = {token: 'tok', projectId: 'prj_1', teamId: 'team_1'};

/** Stub fetch with `impl`, returning the mock. */
function stubFetch(impl) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('vercelQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks the endpoint for the project and team with the token, and returns the response's data", async () => {
    const fetchMock = stubFetch(async () => new Response(JSON.stringify({data: [{count: 3}]})));
    expect(await vercelQuery('aggregate', {filter: "eventName eq 'x'"}, CREDS)).toEqual([{count: 3}]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      'https://api.vercel.com/v1/query/web-analytics/aggregate?projectId=prj_1&filter=eventName+eq+%27x%27&teamId=team_1',
    );
    expect(init.headers).toEqual({Authorization: 'Bearer tok'});
  });

  it('names the endpoint when the request itself fails, as a timeout or a network error does', async () => {
    stubFetch(async () => {
      throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
    });
    await expect(vercelQuery('timeseries', {}, CREDS)).rejects.toThrow(
      'Vercel API timeseries: The operation was aborted due to timeout',
    );
  });

  it('names the endpoint and status of a refused request, never its body', async () => {
    stubFetch(async () => new Response('{"error":{"count":42}}', {status: 403}));
    await expect(vercelQuery('aggregate', {}, CREDS)).rejects.toThrow(/^Vercel API aggregate 403$/);
  });

  it("names the endpoint when the response isn't JSON, without quoting it", async () => {
    stubFetch(async () => new Response('count 42 <html>', {status: 200}));
    await expect(vercelQuery('aggregate', {}, CREDS)).rejects.toThrow(
      /^Vercel API aggregate 200: the response could not be read as JSON$/,
    );
  });
});
