import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {FeaturedEntry} from '../../../app-bridge';
import {DUAL, GOLIATH, SIX, cardByIdIn, entriesFor} from '../featuredFixtures';
import {StaleFeaturedError} from '../githubClient';
import {useFeaturedEditor} from '../useFeaturedEditor';

const {readFeatured, commitFeatured} = vi.hoisted(() => ({readFeatured: vi.fn(), commitFeatured: vi.fn()}));
vi.mock('../githubClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../githubClient')>()),
  readFeatured,
  commitFeatured,
}));

const LOADED = entriesFor(SIX);
const PICKED = entriesFor([SIX[0], GOLIATH, ...SIX.slice(2)]);
const COMMIT_URL = 'https://github.com/Doberjohn/inkweave/commit/abc1234def';
const cardById = cardByIdIn();

beforeEach(() => {
  // Blocks, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  readFeatured.mockReset();
  commitFeatured.mockReset();
});

/** The hook once its first read has landed with `entries`. */
async function loaded(entries: FeaturedEntry[] = LOADED) {
  readFeatured.mockResolvedValueOnce(entries);
  const {result} = renderHook(() => useFeaturedEditor('tok', cardById));
  await waitFor(() => expect(result.current.read.status).toBe('ready'));
  return result;
}

describe('useFeaturedEditor', () => {
  it('reads the branch file into six slots, with Save off until a pick', async () => {
    const result = await loaded();
    expect(result.current.slots.map((slot) => slot.id)).toEqual(SIX.map((card) => card.id));
    expect(result.current.blocked).toBe('Pick a card to change first.');
  });

  it('never lets an older read land over a newer one', async () => {
    let finishFirst: (entries: FeaturedEntry[]) => void = () => {};
    readFeatured.mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)));
    const {result} = renderHook(() => useFeaturedEditor('tok', cardById));
    readFeatured.mockResolvedValueOnce(PICKED);
    await act(async () => {
      await result.current.reload();
    });
    await act(async () => finishFirst(LOADED));
    expect(result.current.read).toEqual({status: 'ready', entries: PICKED});
  });

  it('stages a pick over its slot, and Undo and Discard drop picks', async () => {
    const result = await loaded();
    act(() => result.current.stage(1, GOLIATH));
    expect(result.current.slots[1].id).toBe(GOLIATH.id);
    expect(result.current.saved[1].id).toBe(SIX[1].id);
    expect(result.current.blocked).toBeNull();

    act(() => result.current.undo(1));
    expect(result.current.picks.size).toBe(0);

    act(() => result.current.stage(1, GOLIATH));
    act(() => result.current.stage(0, SIX[0]));
    // Picking the card a slot already holds stages nothing.
    expect(result.current.picks.size).toBe(1);
    act(() => result.current.discard());
    expect(result.current.slots[1].id).toBe(SIX[1].id);
  });

  it('saves the six with the slots that changed, then drops the picks and reads the file again', async () => {
    const result = await loaded();
    commitFeatured.mockResolvedValueOnce({commitUrl: COMMIT_URL});
    readFeatured.mockResolvedValueOnce(PICKED);
    act(() => result.current.stage(1, GOLIATH));
    await act(async () => result.current.onSave());

    expect(commitFeatured).toHaveBeenCalledWith({
      token: 'tok',
      entries: PICKED,
      loaded: LOADED,
      changes: [{ink: 'Amethyst', from: LOADED[1], to: PICKED[1]}],
    });
    expect(result.current.save).toEqual({status: 'saved', commitUrl: COMMIT_URL});
    expect(result.current.picks.size).toBe(0);
    await waitFor(() => expect(result.current.saved[1].id).toBe(GOLIATH.id));
  });

  it('keeps a pick made while the save ran, dropping only the ones it sent', async () => {
    const result = await loaded();
    let land: (value: {commitUrl: string}) => void = () => {};
    commitFeatured.mockReturnValueOnce(new Promise((resolve) => (land = resolve)));
    readFeatured.mockReturnValueOnce(new Promise(() => {}));
    act(() => result.current.stage(1, GOLIATH));
    act(() => result.current.onSave());
    act(() => result.current.stage(4, DUAL));
    await act(async () => land({commitUrl: COMMIT_URL}));

    expect([...result.current.picks.keys()]).toEqual([4]);
    expect(result.current.slots[4].id).toBe(DUAL.id);
  });

  it('shows the six it committed at once, and keeps them when the re-read fails', async () => {
    const result = await loaded();
    commitFeatured.mockResolvedValueOnce({commitUrl: COMMIT_URL});
    readFeatured.mockRejectedValueOnce(new Error('GitHub 502'));
    act(() => result.current.stage(1, GOLIATH));
    await act(async () => result.current.onSave());

    expect(result.current.read).toEqual({status: 'ready', entries: PICKED, reloadError: 'GitHub 502'});
    expect(result.current.saved[1].id).toBe(GOLIATH.id);
  });

  it('keeps the picks after a failed save, and Reload drops them', async () => {
    const result = await loaded();
    commitFeatured.mockRejectedValueOnce(new StaleFeaturedError('master'));
    act(() => result.current.stage(1, GOLIATH));
    await act(async () => result.current.onSave());
    expect(result.current.save).toMatchObject({status: 'failed', kind: 'stale'});
    expect(result.current.picks.size).toBe(1);

    readFeatured.mockResolvedValueOnce(PICKED);
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.picks.size).toBe(0);
    expect(result.current.save.status).toBe('idle');
  });

  it('writes nothing while featuredProblem refuses the six', async () => {
    // Goliath in Amber's place: no card carries Amber.
    const result = await loaded();
    act(() => result.current.stage(0, GOLIATH));
    expect(result.current.blocked).toMatch(/no card is Amber/);
    act(() => result.current.onSave());
    expect(commitFeatured).not.toHaveBeenCalled();
  });
});
