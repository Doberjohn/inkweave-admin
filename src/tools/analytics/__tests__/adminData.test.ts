import {afterEach, describe, expect, it, vi} from 'vitest';
import {cachedAdminData, fetchAdminData, resetAdminDataCache} from '../adminData';

afterEach(() => vi.unstubAllGlobals());

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {headers: {'content-type': 'application/json; charset=utf-8'}});

describe('fetchAdminData', () => {
  it('reads the file from /admin-data/, never the forwarded /data/', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({votes: []}));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchAdminData('vote-log.json')).toEqual({votes: []});
    expect(fetchMock).toHaveBeenCalledWith('/admin-data/vote-log.json');
  });

  it("treats the SPA fallback's index.html as not generated yet", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<!doctype html>', {headers: {'content-type': 'text/html'}})),
    );
    await expect(fetchAdminData('vote-log.json')).rejects.toThrow('vote-log.json has not been generated yet');
  });

  it('reports an HTTP error with its status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 404})));
    await expect(fetchAdminData('vote-log.json')).rejects.toThrow('vote-log.json: HTTP 404');
  });

  it('fetches each file once for the session', async () => {
    // A fresh Response per call: a body can only be read once.
    const fetchMock = vi.fn(async (url: string) => json({url}));
    vi.stubGlobal('fetch', fetchMock);

    const first = fetchAdminData('vote-log.json');
    expect(fetchAdminData('vote-log.json')).toBe(first);
    const log = await first;
    expect(log).toEqual({url: '/admin-data/vote-log.json'});

    // Still cached once settled (the same parsed object), and each file has its own entry.
    expect(await fetchAdminData('vote-log.json')).toBe(log);
    expect(await fetchAdminData('vote-analytics.json')).toEqual({url: '/admin-data/vote-analytics.json'});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('drops a failed fetch, so the next call tries again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', {status: 503}))
      .mockResolvedValueOnce(json({votes: []}));
    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchAdminData('vote-log.json')).rejects.toThrow('vote-log.json: HTTP 503');
    expect(await fetchAdminData('vote-log.json')).toEqual({votes: []});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('hands back an artifact synchronously once it has loaded, never a failed one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(json({votes: []})).mockResolvedValueOnce(new Response('', {status: 503})),
    );

    const pending = fetchAdminData('vote-log.json');
    expect(cachedAdminData('vote-log.json')).toBeUndefined();
    const log = await pending;
    expect(cachedAdminData('vote-log.json')).toBe(log);

    await expect(fetchAdminData('vote-analytics.json')).rejects.toThrow('vote-analytics.json: HTTP 503');
    expect(cachedAdminData('vote-analytics.json')).toBeUndefined();
  });

  it('fetches again after resetAdminDataCache()', async () => {
    const fetchMock = vi.fn(async () => json({votes: []}));
    vi.stubGlobal('fetch', fetchMock);

    await fetchAdminData('vote-log.json');
    resetAdminDataCache();
    expect(cachedAdminData('vote-log.json')).toBeUndefined();
    await fetchAdminData('vote-log.json');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the newer fetch when one started before a reset fails', async () => {
    let failStale: (err: Error) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((_resolve, reject) => {
            failStale = reject;
          }),
      )
      .mockImplementation(async () => json({votes: []}));
    vi.stubGlobal('fetch', fetchMock);

    const stale = fetchAdminData('vote-log.json');
    resetAdminDataCache();
    await fetchAdminData('vote-log.json');
    failStale(new Error('network down'));
    await expect(stale).rejects.toThrow('network down');

    await fetchAdminData('vote-log.json');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
