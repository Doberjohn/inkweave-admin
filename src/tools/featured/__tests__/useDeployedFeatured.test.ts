import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {useDeployedFeatured} from '../useDeployedFeatured';

afterEach(() => vi.restoreAllMocks());

/** What inkweave.ink's /data/featuredCards.json holds: LorcanaJSON's shape, ids as numbers. */
const JSON_TYPE = {headers: {'content-type': 'application/json'}};
const served = (ids: number[]) => new Response(JSON.stringify({metadata: {}, sets: {}, cards: ids.map((id) => ({id}))}), JSON_TYPE);

describe('useDeployedFeatured', () => {
  it('reads the served ids as strings, past every cache', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(served([3286, 3328]));
    const {result} = renderHook(() => useDeployedFeatured());
    await waitFor(() => expect(result.current).toMatchObject({status: 'ready', ids: ['3286', '3328']}));
    expect(fetch).toHaveBeenCalledWith('/data/featuredCards.json', {cache: 'no-store'});
  });

  it('says why a read failed', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', {status: 503}));
    const {result} = renderHook(() => useDeployedFeatured());
    await waitFor(() =>
      expect(result.current).toMatchObject({status: 'error', error: 'inkweave.ink answered 503 for /data/featuredCards.json'}),
    );
  });

  it('refuses a page that isn’t JSON, as a path the server lacks answers with the app’s HTML', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('<!doctype html>', {headers: {'content-type': 'text/html'}}));
    const {result} = renderHook(() => useDeployedFeatured());
    await waitFor(() => expect(result.current).toMatchObject({status: 'error', error: '/data/featuredCards.json isn’t JSON here'}));
  });

  it('refuses a list with a card that has no id', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({cards: [{id: 3286}, {}]}), JSON_TYPE));
    const {result} = renderHook(() => useDeployedFeatured());
    await waitFor(() =>
      expect(result.current).toMatchObject({status: 'error', error: '/data/featuredCards.json lists a card with no id'}),
    );
  });

  it('reads anew on Check again', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(served([3286])).mockResolvedValueOnce(served([3318]));
    const {result} = renderHook(() => useDeployedFeatured());
    await waitFor(() => expect(result.current).toMatchObject({ids: ['3286']}));
    act(() => result.current.check());
    await waitFor(() => expect(result.current).toMatchObject({ids: ['3318']}));
  });
});
