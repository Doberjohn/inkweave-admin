import {afterEach, describe, expect, it, vi} from 'vitest';
import {renderHook, waitFor} from '@testing-library/react';
import {useVoteAnalytics} from '../useVoteAnalytics';

afterEach(() => vi.unstubAllGlobals());

const payload = {generatedAt: 'x', hasRawVotes: false, global: {totalVotes: 5}, rules: [], pairs: []};
/** A fresh response per call: a body can only be read once. */
const ok = () => new Response(JSON.stringify(payload), {headers: {'content-type': 'application/json'}});

describe('useVoteAnalytics', () => {
  it('returns data on a successful fetch', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(ok()));
    const {result} = renderHook(() => useVoteAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data?.global.totalVotes).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', {status: 404})));
    const {result} = renderHook(() => useVoteAnalytics());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('reuses the first fetch when it mounts again', async () => {
    const fetchMock = vi.fn(async () => ok());
    vi.stubGlobal('fetch', fetchMock);
    const first = renderHook(() => useVoteAnalytics());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    first.unmount();

    // No waitFor: the second mount's first render already has the data.
    const second = renderHook(() => useVoteAnalytics());
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.data?.global.totalVotes).toBe(5);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fetches again on the next mount after a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', {status: 404}))
      .mockResolvedValueOnce(ok());
    vi.stubGlobal('fetch', fetchMock);
    const first = renderHook(() => useVoteAnalytics());
    await waitFor(() => expect(first.result.current.error).toBeInstanceOf(Error));
    first.unmount();

    // A failed fetch is never handed back, so this mount loads again.
    const second = renderHook(() => useVoteAnalytics());
    expect(second.result.current.loading).toBe(true);
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.data?.global.totalVotes).toBe(5);
    expect(second.result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
