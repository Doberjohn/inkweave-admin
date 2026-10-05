import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {useLiveTuning} from '../useLiveTuning';

const readTuning = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', () => ({readTuning}));

const BAD_GATEWAY = 'GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway';

const config = (name: string): TuningConfig => ({
  playstyles: {ramp: {name, tagline: 't'}},
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
});

beforeEach(() => {
  // A block, not an arrow's value: mockReset() returns the mock, and Vitest calls a function a hook returns as its teardown.
  readTuning.mockReset();
});

/** Renders the hook once its first read has landed with `name`. */
async function loaded(name: string) {
  readTuning.mockResolvedValueOnce(config(name));
  const {result} = renderHook(() => useLiveTuning('tok'));
  await waitFor(() => expect(result.current).toMatchObject({status: 'ready', config: config(name)}));
  return result;
}

describe('useLiveTuning', () => {
  it('reloads on request, showing the values it has until the new ones arrive', async () => {
    readTuning.mockResolvedValueOnce(config('Before'));
    const {result} = renderHook(() => useLiveTuning('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'ready', config: config('Before')}));

    let finish: (value: TuningConfig) => void = () => {};
    readTuning.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    act(() => {
      void result.current.reload();
    });
    expect(result.current).toMatchObject({status: 'ready', config: config('Before')});

    await act(async () => finish(config('After')));
    expect(result.current).toMatchObject({status: 'ready', config: config('After')});
  });

  it('resolves a reload with the tuning.json it read', async () => {
    const result = await loaded('Before');
    readTuning.mockResolvedValueOnce(config('After'));
    let reloaded: TuningConfig | null = null;
    await act(async () => {
      reloaded = await result.current.reload();
    });
    expect(reloaded).toEqual(config('After'));
  });

  it('says why the first read failed, with no values to show', async () => {
    readTuning.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    const {result} = renderHook(() => useLiveTuning('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error', error: BAD_GATEWAY}));
    expect(result.current).not.toHaveProperty('config');
  });

  it('resolves a failed reload with null, and keeps the last values it read beside the reason', async () => {
    const result = await loaded('Before');
    readTuning.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    let reloaded: TuningConfig | null = config('unset');
    await act(async () => {
      reloaded = await result.current.reload();
    });
    expect(reloaded).toBeNull();
    // A publish's commit link and the pending edits stay on screen (C1).
    expect(result.current).toEqual({
      status: 'ready',
      config: config('Before'),
      reloadError: BAD_GATEWAY,
      reload: expect.any(Function),
    });
  });

  it('drops the reload error once a read lands', async () => {
    const result = await loaded('Before');
    readTuning.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    await act(async () => {
      await result.current.reload();
    });
    readTuning.mockResolvedValueOnce(config('After'));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current).toEqual({status: 'ready', config: config('After'), reload: expect.any(Function)});
  });

  it('stays on the failed first read when reading again fails too', async () => {
    readTuning.mockRejectedValueOnce(new Error('GitHub 404 on packages/synergy-engine/src/data/tuning.json: Not Found'));
    const {result} = renderHook(() => useLiveTuning('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'error'}));
    readTuning.mockRejectedValueOnce(new Error(BAD_GATEWAY));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current).toMatchObject({status: 'error', error: BAD_GATEWAY});
  });

  it('ignores an older read that fails after a newer one landed', async () => {
    const result = await loaded('Before');
    let failFirst: (e: Error) => void = () => {};
    readTuning.mockReturnValueOnce(new Promise((_, reject) => (failFirst = reject)));
    readTuning.mockResolvedValueOnce(config('Second'));

    let first: Promise<TuningConfig | null> = Promise.resolve(null);
    act(() => {
      first = result.current.reload();
    });
    await act(async () => {
      await result.current.reload();
    });
    await act(async () => {
      failFirst(new Error(BAD_GATEWAY));
      await first;
    });

    expect(result.current).toEqual({status: 'ready', config: config('Second'), reload: expect.any(Function)});
  });

  it('keeps the newest read when an older one lands after it, and resolves the older with null', async () => {
    const result = await loaded('Before');
    let finishFirst: (value: TuningConfig) => void = () => {};
    readTuning.mockReturnValueOnce(new Promise((resolve) => (finishFirst = resolve)));
    readTuning.mockResolvedValueOnce(config('Second'));

    let first: Promise<TuningConfig | null> = Promise.resolve(null);
    act(() => {
      first = result.current.reload();
    });
    await act(async () => {
      await result.current.reload();
    });
    let landedLate: TuningConfig | null = config('unset');
    await act(async () => {
      finishFirst(config('First'));
      landedLate = await first;
    });

    expect(result.current).toMatchObject({status: 'ready', config: config('Second')});
    expect(landedLate).toBeNull();
  });
});
