import {afterEach, describe, expect, it, vi} from 'vitest';
import {fetchAdminData} from '../adminData';

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
});
