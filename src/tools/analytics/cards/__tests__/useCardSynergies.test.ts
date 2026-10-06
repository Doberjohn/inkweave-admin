import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {ENGINE_EMPTY, ENGINE_FIFTEEN, ENGINE_ONE_PARTNER} from '../cardFixtures';
import type {CardSynergies} from '../engineView';
import {useCardSynergies} from '../useCardSynergies';

// fetchCardSynergies caches each id for the session in module state
// (usePrecomputedSynergies.ts:42), so the tests mock it through the bridge and
// keep the rest of the bridge real.
const fetchCardSynergies = vi.hoisted(() => vi.fn());
vi.mock('../../../../app-bridge', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../app-bridge')>()),
  fetchCardSynergies,
}));

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  fetchCardSynergies.mockReset();
  fetchCardSynergies.mockResolvedValue(ENGINE_EMPTY.data);
});

/** A fetch that settles when the test says. */
function deferred() {
  let resolve: (data: CardSynergies) => void = () => {};
  let reject: (err: unknown) => void = () => {};
  const promise = new Promise<CardSynergies>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

describe('useCardSynergies', () => {
  it('reads as loading, then gives the card’s synergy file', async () => {
    fetchCardSynergies.mockResolvedValueOnce(ENGINE_FIFTEEN.data);
    const {result} = renderHook(() => useCardSynergies('301'));
    expect(result.current).toMatchObject({data: null, loading: true, error: null});

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, error: null});
    expect(fetchCardSynergies).toHaveBeenCalledExactlyOnceWith('301');
  });

  it('says why the fetch failed, and gives no file', async () => {
    fetchCardSynergies.mockRejectedValueOnce(new SyntaxError('Unexpected end of JSON input'));
    const {result} = renderHook(() => useCardSynergies('301'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeInstanceOf(SyntaxError);
    expect(result.current.error?.message).toBe('Unexpected end of JSON input');
  });

  it('wraps a rejection that is not an Error', async () => {
    fetchCardSynergies.mockRejectedValueOnce('offline');
    const {result} = renderHook(() => useCardSynergies('301'));

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('offline');
  });

  it('fetches again on retry: loading with the error cleared, then the file', async () => {
    fetchCardSynergies.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const {result} = renderHook(() => useCardSynergies('301'));
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to fetch'));

    const second = deferred();
    fetchCardSynergies.mockReturnValueOnce(second.promise);
    act(() => result.current.retry());
    expect(result.current).toMatchObject({data: null, loading: true, error: null});

    await act(async () => second.resolve(ENGINE_FIFTEEN.data));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, loading: false, error: null});
    expect(fetchCardSynergies.mock.calls).toEqual([['301'], ['301']]);
  });

  it('reads as loading as soon as the id changes, never with the previous card’s file', async () => {
    fetchCardSynergies.mockResolvedValueOnce(ENGINE_FIFTEEN.data);
    const {result, rerender} = renderHook(({id}) => useCardSynergies(id), {initialProps: {id: '301'}});
    await waitFor(() => expect(result.current.data).toBe(ENGINE_FIFTEEN.data));

    const next = deferred();
    fetchCardSynergies.mockReturnValueOnce(next.promise);
    rerender({id: '401'});
    expect(result.current).toMatchObject({data: null, loading: true, error: null});

    await act(async () => next.resolve(ENGINE_ONE_PARTNER.data));
    expect(result.current).toMatchObject({data: ENGINE_ONE_PARTNER.data, loading: false});
  });

  it('drops a late answer for a card it has moved past, after coming back to the first card too', async () => {
    const first = deferred();
    const other = deferred();
    const back = deferred();
    fetchCardSynergies
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(other.promise)
      .mockReturnValueOnce(back.promise);
    const {result, rerender} = renderHook(({id}) => useCardSynergies(id), {initialProps: {id: '301'}});
    rerender({id: '401'});
    rerender({id: '301'});

    await act(async () => back.resolve(ENGINE_FIFTEEN.data));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, loading: false});

    await act(async () => other.resolve(ENGINE_ONE_PARTNER.data));
    await act(async () => first.reject(new TypeError('Failed to fetch')));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, loading: false, error: null});
  });

  it('shows a card’s last outcome when it comes back before the card in between settles, until the new fetch lands', async () => {
    fetchCardSynergies.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const {result, rerender} = renderHook(({id}) => useCardSynergies(id), {initialProps: {id: '301'}});
    await waitFor(() => expect(result.current.error?.message).toBe('Failed to fetch'));

    const other = deferred();
    const back = deferred();
    fetchCardSynergies.mockReturnValueOnce(other.promise).mockReturnValueOnce(back.promise);
    rerender({id: '401'});
    expect(result.current).toMatchObject({data: null, loading: true, error: null});
    // The last fetch that settled still answers 301 and its try, so it shows
    // again while the third fetch is in flight.
    rerender({id: '301'});
    expect(result.current).toMatchObject({data: null, loading: false});
    expect(result.current.error?.message).toBe('Failed to fetch');

    await act(async () => back.resolve(ENGINE_FIFTEEN.data));
    expect(result.current).toMatchObject({data: ENGINE_FIFTEEN.data, loading: false, error: null});
    expect(fetchCardSynergies.mock.calls).toEqual([['301'], ['401'], ['301']]);
  });

  it('fetches nothing for no card, and drops the file when the card goes', async () => {
    const {result, rerender} = renderHook(({id}) => useCardSynergies(id), {
      initialProps: {id: null as string | null},
    });
    expect(result.current).toMatchObject({data: null, loading: false, error: null});
    expect(fetchCardSynergies).not.toHaveBeenCalled();

    fetchCardSynergies.mockResolvedValueOnce(ENGINE_ONE_PARTNER.data);
    rerender({id: '401'});
    await waitFor(() => expect(result.current.data).toBe(ENGINE_ONE_PARTNER.data));
    rerender({id: null});
    expect(result.current).toMatchObject({data: null, loading: false, error: null});
  });
});
