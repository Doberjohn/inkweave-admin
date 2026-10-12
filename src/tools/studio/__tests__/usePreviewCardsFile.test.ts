import {afterEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';

const readPreviewCards = vi.hoisted(() => vi.fn());
vi.mock('../../reveal/githubClient', () => ({readPreviewCards}));

import {usePreviewCardsFile} from '../usePreviewCardsFile';

const ONE = {id: 14001} as LorcanaJSONCard;
const TWO = {id: 14002} as LorcanaJSONCard;

afterEach(() => {
  readPreviewCards.mockReset();
});

/** A read the test lands by hand. */
function deferred() {
  let settle: (cards: LorcanaJSONCard[]) => void = () => {};
  const promise = new Promise<LorcanaJSONCard[]>((resolve) => (settle = resolve));
  return {promise, settle: (cards: LorcanaJSONCard[]) => act(async () => settle(cards))};
}

async function openFile() {
  const hook = renderHook(() => usePreviewCardsFile('tok'));
  await act(async () => {});
  return hook;
}

describe('usePreviewCardsFile', () => {
  it('reads the file with the token, and names the request each read answers', async () => {
    readPreviewCards.mockResolvedValue([ONE]);
    const file = await openFile();
    expect(readPreviewCards).toHaveBeenCalledWith('tok');
    expect(file.result.current).toMatchObject({status: 'ready', read: 0, requested: 0, ids: new Set([14001])});

    readPreviewCards.mockResolvedValue([ONE, TWO]);
    act(() => file.result.current.reload());
    await act(async () => {});
    expect(file.result.current).toMatchObject({status: 'ready', read: 1, requested: 1, ids: new Set([14001, 14002])});
  });

  it('lands only the newest request, whichever read finishes last', async () => {
    readPreviewCards.mockResolvedValue([ONE]);
    const file = await openFile();
    const older = deferred();
    const newer = deferred();
    readPreviewCards.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    act(() => file.result.current.reload());
    act(() => file.result.current.reload());

    await newer.settle([ONE, TWO]);
    await older.settle([TWO]);
    expect(file.result.current).toMatchObject({read: 2, ids: new Set([14001, 14002])});
  });

  it('keeps the last read when a reload fails, until the next request clears the error', async () => {
    readPreviewCards.mockResolvedValue([ONE]);
    const file = await openFile();
    readPreviewCards.mockRejectedValueOnce(new Error('GitHub 502'));
    act(() => file.result.current.reload());
    await act(async () => {});
    expect(file.result.current).toMatchObject({status: 'ready', read: 0, reloadError: 'GitHub 502'});

    act(() => file.result.current.reload());
    expect(file.result.current).toMatchObject({status: 'ready', read: 0});
    expect(file.result.current).not.toHaveProperty('reloadError');
  });

  it('shows a file that never loaded as loading again on reload', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error('GitHub 502')).mockResolvedValue([ONE]);
    const file = await openFile();
    expect(file.result.current).toMatchObject({status: 'error', error: 'GitHub 502'});

    act(() => file.result.current.reload());
    expect(file.result.current.status).toBe('loading');
    await act(async () => {});
    expect(file.result.current).toMatchObject({status: 'ready', read: 1});
  });
});
