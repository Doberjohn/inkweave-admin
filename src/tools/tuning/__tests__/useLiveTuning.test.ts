import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {useLiveTuning} from '../useLiveTuning';

const readTuning = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', () => ({readTuning}));

const config = (name: string): TuningConfig => ({
  playstyles: {ramp: {name, tagline: 't'}},
  directRules: {},
  ruleTexts: {'shift-targets': {}, ramp: {scores: {}, templates: {}}},
});

beforeEach(() => readTuning.mockReset());

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

  it('resolves a failed reload with null, and says why the read failed', async () => {
    const result = await loaded('Before');
    readTuning.mockRejectedValueOnce(new Error('GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway'));
    let reloaded: TuningConfig | null = config('unset');
    await act(async () => {
      reloaded = await result.current.reload();
    });
    expect(reloaded).toBeNull();
    expect(result.current).toMatchObject({
      status: 'error',
      error: 'GitHub 502 on packages/synergy-engine/src/data/tuning.json: Bad gateway',
    });
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
