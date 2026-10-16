import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {isRejectedToken} from '../../../github/rejectedToken';
import {usePreviewCardsFile, type UsePreviewCardsFileResult} from '../usePreviewCardsFile';

const readPreviewCards = vi.hoisted(() => vi.fn());
vi.mock('../../reveal/githubClient', () => ({readPreviewCards}));

const BAD_GATEWAY = 'GitHub 502 on apps/web/public/data/previewCards.json: Bad gateway';
// readRepoFile's wording for a token GitHub refused (githubCommit.ts), which isRejectedToken matches.
const UNAUTHORIZED = 'GitHub 401 on apps/web/public/data/previewCards.json: {"message":"Bad credentials"}';

/** A set-14 preview entry, as previewCards.json holds one. */
const entry = ({id, name}: {id: number; name: string}): LorcanaJSONCard => ({
  id,
  name,
  fullName: name,
  cost: 1,
  color: 'Amber',
  inkwell: true,
  type: 'Action',
  setCode: '14',
  number: id - 14000,
});

const FIRST = entry({id: 14001, name: 'First'});
const SECOND = entry({id: 14002, name: 'Second'});
// SECOND as a save committed it, and as the branch holds it on the next read.
const RENAMED = {...SECOND, name: 'Renamed', fullName: 'Renamed'};
const BEFORE = [FIRST, SECOND];
const AFTER = [FIRST, RENAMED];
const IDS = new Set([14001, 14002]);

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  readPreviewCards.mockReset();
});

/** Renders the hook once its first read has landed with `cards`. */
async function loaded(cards: LorcanaJSONCard[]) {
  readPreviewCards.mockResolvedValueOnce(cards);
  const {result} = renderHook(() => usePreviewCardsFile('tok'));
  await waitFor(() => expect(result.current).toMatchObject({status: 'ready', read: 1}));
  return result;
}

/** The next read, finishing only when the test says so. */
function deferRead() {
  let finish: (cards: LorcanaJSONCard[]) => void = () => {};
  let fail: (e: Error) => void = () => {};
  readPreviewCards.mockReturnValueOnce(
    new Promise<LorcanaJSONCard[]>((resolve, reject) => {
      finish = resolve;
      fail = reject;
    }),
  );
  return {finish: (cards: LorcanaJSONCard[]) => finish(cards), fail: (e: Error) => fail(e)};
}

/**
 * Asks for a reload and returns what it resolves with. The read starts in an
 * effect, which runs only once the act that asked for it ends, so the promise
 * is awaited after that act, never inside it.
 */
async function reloaded(result: {current: UsePreviewCardsFileResult}): Promise<LorcanaJSONCard[] | null> {
  let settled: Promise<LorcanaJSONCard[] | null> = Promise.resolve(null);
  await act(async () => {
    settled = result.current.reload();
  });
  return settled;
}

describe('usePreviewCardsFile', () => {
  it('reads previewCards.json from the branch once, as read 1, with its ids', async () => {
    const result = await loaded(BEFORE);
    expect(result.current).toEqual({
      status: 'ready',
      cards: BEFORE,
      ids: IDS,
      read: 1,
      requested: 1,
      reload: expect.any(Function),
      commit: expect.any(Function),
    });
    expect(readPreviewCards).toHaveBeenCalledTimes(1);
    expect(readPreviewCards).toHaveBeenCalledWith('tok');
  });

  it('reloads on request, showing the cards it has until the new ones arrive', async () => {
    const result = await loaded(BEFORE);
    const next = deferRead();
    act(() => {
      void result.current.reload();
    });
    expect(result.current).toMatchObject({status: 'ready', cards: BEFORE, read: 1, requested: 2});

    await act(async () => next.finish(AFTER));
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 2, requested: 2});
  });

  it('resolves a reload once its cards are on screen, with those cards', async () => {
    const result = await loaded(BEFORE);
    readPreviewCards.mockResolvedValueOnce(AFTER);
    let whenSettled: unknown = null;
    await act(async () => {
      void result.current.reload().then((cards) => {
        whenSettled = {cards, shown: result.current.status === 'ready' && result.current.read};
      });
    });
    expect(whenSettled).toEqual({cards: AFTER, shown: 2});
  });

  it('says why the first read failed, with no cards to show', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    const {result} = renderHook(() => usePreviewCardsFile('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error', error: BAD_GATEWAY}));
    expect(result.current).not.toHaveProperty('cards');
  });

  it('retries a failed first read, and resolves the retry once its cards are on screen', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    const {result} = renderHook(() => usePreviewCardsFile('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error'}));

    readPreviewCards.mockResolvedValueOnce(BEFORE);
    expect(await reloaded(result)).toEqual(BEFORE);
    expect(result.current).toMatchObject({status: 'ready', cards: BEFORE, read: 2, requested: 2});
  });

  it('resolves a failed reload with null, and keeps the last cards it read beside the reason', async () => {
    const result = await loaded(BEFORE);
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    expect(await reloaded(result)).toBeNull();
    // The card on screen, and a save's outcome, stay beside the error (C1).
    expect(result.current).toEqual({
      status: 'ready',
      cards: BEFORE,
      ids: IDS,
      read: 1,
      reloadError: BAD_GATEWAY,
      requested: 2,
      reload: expect.any(Function),
      commit: expect.any(Function),
    });
  });

  it('drops the reload error once a read lands', async () => {
    const result = await loaded(BEFORE);
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    await reloaded(result);
    readPreviewCards.mockResolvedValueOnce(AFTER);
    await reloaded(result);
    expect(result.current).not.toHaveProperty('reloadError');
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 3, requested: 3});
  });

  it('stays on the failed first read when reading again fails too', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error('GitHub 404 on apps/web/public/data/previewCards.json: Not Found'));
    const {result} = renderHook(() => usePreviewCardsFile('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error'}));
    readPreviewCards.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    await reloaded(result);
    expect(result.current).toEqual({
      status: 'error',
      error: BAD_GATEWAY,
      requested: 2,
      reload: expect.any(Function),
      commit: expect.any(Function),
    });
  });

  it('keeps a first read refused for the token as GitHub worded it, so the page can offer Forget token (R-26)', async () => {
    readPreviewCards.mockRejectedValueOnce(new Error(UNAUTHORIZED));
    const {result} = renderHook(() => usePreviewCardsFile('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error', error: UNAUTHORIZED}));
    expect(result.current.status === 'error' && isRejectedToken(result.current.error)).toBe(true);
  });

  it('keeps the cards beside a reload refused for the token, worded as GitHub worded it (R-26)', async () => {
    const result = await loaded(BEFORE);
    readPreviewCards.mockRejectedValueOnce(new Error(UNAUTHORIZED));
    await reloaded(result);
    expect(result.current).toMatchObject({status: 'ready', cards: BEFORE, reloadError: UNAUTHORIZED});
    expect(result.current.status === 'ready' && isRejectedToken(result.current.reloadError ?? '')).toBe(true);
  });

  it('ignores an older read that fails after a newer one landed', async () => {
    const result = await loaded(BEFORE);
    const older = deferRead();
    readPreviewCards.mockResolvedValueOnce(AFTER);
    act(() => {
      void result.current.reload();
    });
    await reloaded(result);
    await act(async () => older.fail(new Error(BAD_GATEWAY)));

    expect(result.current).not.toHaveProperty('reloadError');
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 3, requested: 3});
  });

  it('keeps the newest read when an older one lands after it, and answers both callers with its cards', async () => {
    const result = await loaded(BEFORE);
    const older = deferRead();
    readPreviewCards.mockResolvedValueOnce(AFTER);
    let first: Promise<LorcanaJSONCard[] | null> = Promise.resolve(null);
    act(() => {
      first = result.current.reload();
    });
    await reloaded(result);
    await act(async () => older.finish(BEFORE));

    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 3});
    await expect(first).resolves.toEqual(AFTER);
  });

  it('drops a read that lands in the tick a newer one is asked for', async () => {
    const result = await loaded(BEFORE);
    const older = deferRead();
    const newer = deferRead();
    act(() => {
      void result.current.reload();
    });
    // The newer request and the older read's landing reach React in one batch, before the older read is cancelled.
    await act(async () => {
      void result.current.reload();
      older.finish([FIRST]);
      await Promise.resolve();
    });
    expect(result.current).toMatchObject({cards: BEFORE, read: 1, requested: 3});

    await act(async () => newer.finish(AFTER));
    expect(result.current).toMatchObject({cards: AFTER, read: 3});
  });

  it('reads again for a new token, and drops the old token’s read when it lands late', async () => {
    const old = deferRead();
    readPreviewCards.mockResolvedValueOnce(AFTER);
    const {result, rerender} = renderHook(({token}) => usePreviewCardsFile(token), {initialProps: {token: 'old'}});
    rerender({token: 'new'});
    await waitFor(() => expect(result.current).toMatchObject({status: 'ready', cards: AFTER}));

    await act(async () => old.finish(BEFORE));
    expect(result.current).toMatchObject({cards: AFTER, read: 1});
    expect(readPreviewCards).toHaveBeenLastCalledWith('new');
  });

  it('puts a committed entry in place at once, then reads the file again', async () => {
    const result = await loaded(BEFORE);
    const next = deferRead();
    act(() => result.current.commit(RENAMED));
    // A card reopened now seeds from what was committed, not from the read before the save.
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, ids: IDS, read: 1, requested: 2});
    expect(readPreviewCards).toHaveBeenCalledTimes(2);

    await act(async () => next.finish(AFTER));
    expect(result.current).toMatchObject({status: 'ready', cards: AFTER, read: 2, requested: 2});
  });

  it('never lets a read asked for before a commit land over it', async () => {
    const result = await loaded(BEFORE);
    const beforeCommit = deferRead();
    const afterCommit = deferRead();
    let asked: Promise<LorcanaJSONCard[] | null> = Promise.resolve(null);
    act(() => {
      asked = result.current.reload();
    });
    act(() => result.current.commit(RENAMED));

    // The read from before the commit still holds the old entry: it is dropped, and the caller waits on.
    await act(async () => beforeCommit.finish(BEFORE));
    expect(result.current).toMatchObject({cards: AFTER, read: 1, requested: 3});

    await act(async () => afterCommit.finish(AFTER));
    expect(result.current).toMatchObject({cards: AFTER, read: 3});
    await expect(asked).resolves.toEqual(AFTER);
  });

  it('leaves the cards alone when the committed entry isn’t among them', async () => {
    const result = await loaded([FIRST]);
    deferRead();
    act(() => result.current.commit(RENAMED));
    expect(result.current).toMatchObject({status: 'ready', cards: [FIRST], read: 1, requested: 2});
  });
});
