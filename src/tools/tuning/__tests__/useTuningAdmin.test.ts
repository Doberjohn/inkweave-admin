import {describe, it, expect, vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {useTuningAdmin} from '../useTuningAdmin';

// Publishes go through commitTuning; each test decides when (and how) it settles.
const commitTuning = vi.hoisted(() => vi.fn());
vi.mock('../githubClient', () => ({commitTuning}));

const PATH = ['ruleTexts', 'shift-targets', 'curve.gap3', 'score'];

/** Renders the hook and stages each raw score for PATH (saved value 5), one act per edit. */
function stageScores(...raws: string[]) {
  const {result} = renderHook(() => useTuningAdmin('tok'));
  for (const rawValue of raws) {
    act(() => {
      result.current.stageEdit({path: PATH, rawValue, kind: 'score', oldValue: 5, label: 'label'});
    });
  }
  return result;
}

describe('useTuningAdmin', () => {
  it('keeps edits staged while a publish is in flight', async () => {
    let finish: (result: {commitUrl: string}) => void = () => {};
    commitTuning.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const {result} = renderHook(() => useTuningAdmin('tok'));
    act(() => {
      result.current.stageEdit({path: PATH, rawValue: '6', kind: 'score', oldValue: 5, label: 'published'});
    });

    let publishing: Promise<unknown> = Promise.resolve();
    act(() => {
      publishing = result.current.publish();
    });
    act(() => {
      result.current.stageEdit({path: ['playstyles', 'ramp', 'name'], rawValue: 'Ramp!', kind: 'text', oldValue: 'Ramp', label: 'later'});
    });
    await act(async () => {
      finish({commitUrl: 'https://github.com/x/y/commit/1'});
      await publishing;
    });

    expect(result.current.pending.map((edit) => edit.label)).toEqual(['later']);
  });

  it('publishes text without the spaces around it', async () => {
    commitTuning.mockResolvedValue({commitUrl: 'https://github.com/x/y/commit/2'});
    const {result} = renderHook(() => useTuningAdmin('tok'));
    act(() => {
      result.current.stageEdit({path: ['playstyles', 'ramp', 'name'], rawValue: ' Big Ramp ', kind: 'text', oldValue: 'Ramp', label: 'name'});
    });
    await act(async () => {
      await result.current.publish();
    });
    expect(commitTuning).toHaveBeenLastCalledWith({token: 'tok', edits: [{path: ['playstyles', 'ramp', 'name'], value: 'Big Ramp'}]});
  });

  it("drops the last publish's outcome once new work is staged", async () => {
    commitTuning.mockResolvedValue({commitUrl: 'https://github.com/x/y/commit/3'});
    const result = stageScores('6');
    await act(async () => {
      await result.current.publish();
    });
    expect(result.current.result).not.toBeNull();
    act(() => {
      result.current.stageEdit({path: PATH, rawValue: '7', kind: 'score', oldValue: 5, label: 'label'});
    });
    expect(result.current.result).toBeNull();
  });

  it('stages a valid score edit as one pending entry', () => {
    const result = stageScores('6');
    expect(result.current.pending).toHaveLength(1);
    expect(result.current.pending[0]).toMatchObject({valid: true, value: 6, oldValue: 5});
  });

  it('upserts on the same path so only the last value is kept', () => {
    const result = stageScores('6', '7');
    expect(result.current.pending).toHaveLength(1);
    expect(result.current.pending[0].value).toBe(7);
  });

  it('removes the pending entry when edited back to the original value', () => {
    expect(stageScores('6', '5').current.pending).toHaveLength(0);
  });

  it('marks an out-of-range score invalid and disables publish', () => {
    const result = stageScores('11');
    expect(result.current.pending[0].valid).toBe(false);
    expect(result.current.publishDisabled).toBe(true);
  });

  it('revertEdit removes a single entry; clear empties all', () => {
    const {result} = renderHook(() => useTuningAdmin('tok'));
    act(() => {
      result.current.stageEdit({path: PATH, rawValue: '6', kind: 'score', oldValue: 5, label: 'a'});
      result.current.stageEdit({path: ['playstyles', 'ramp', 'name'], rawValue: 'Ramp!', kind: 'text', oldValue: 'Ramp', label: 'b'});
    });
    expect(result.current.pending).toHaveLength(2);

    act(() => {
      result.current.revertEdit(JSON.stringify(PATH));
    });
    expect(result.current.pending).toHaveLength(1);

    act(() => {
      result.current.clear();
    });
    expect(result.current.pending).toHaveLength(0);
  });

  it('publishDisabled is true with zero edits and false with one valid edit', () => {
    const {result} = renderHook(() => useTuningAdmin('tok'));
    expect(result.current.publishDisabled).toBe(true);

    act(() => {
      result.current.stageEdit({path: PATH, rawValue: '6', kind: 'score', oldValue: 5, label: 'label'});
    });
    expect(result.current.publishDisabled).toBe(false);
  });
});
