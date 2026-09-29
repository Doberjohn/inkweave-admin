import {describe, expect, it, vi} from 'vitest';
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

describe('useLiveTuning', () => {
  it('reloads on request, showing the values it has until the new ones arrive', async () => {
    readTuning.mockResolvedValueOnce(config('Before'));
    const {result} = renderHook(() => useLiveTuning('tok'));
    await waitFor(() => expect(result.current).toMatchObject({status: 'ready', config: config('Before')}));

    let finish: (value: TuningConfig) => void = () => {};
    readTuning.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    act(() => result.current.reload());
    expect(result.current).toMatchObject({status: 'ready', config: config('Before')});

    await act(async () => finish(config('After')));
    expect(result.current).toMatchObject({status: 'ready', config: config('After')});
  });
});
