import {describe, it, expect, vi} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import type {TuningConfig} from 'inkweave-synergy-engine';
import {stillApplies, useTuningAdmin} from '../useTuningAdmin';

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

const TITLE = ['playstyles', 'ramp', 'name'];

/** tuning.json as a reload reads it: PATH still holds 5, and Ramp's title is `rampTitle`. */
const reloaded = (rampTitle: string): TuningConfig => ({
  playstyles: {ramp: {name: rampTitle, tagline: 't'}},
  directRules: {},
  ruleTexts: {'shift-targets': {'curve.gap3': {score: 5, text: 'Wide'}}, ramp: {scores: {}, templates: {}}},
});

/** Renders the hook with two edits staged: PATH 5 → 6 (stageScores labels it 'label') and Ramp's title 'Ramp' → 'Ramp!' ('title'). */
function stageTwo() {
  const result = stageScores('6');
  act(() => {
    result.current.stageEdit({path: TITLE, rawValue: 'Ramp!', kind: 'text', oldValue: 'Ramp', label: 'title'});
  });
  return result;
}

const labels = (pending: {label: string}[]) => pending.map((edit) => edit.label);

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
    expect(commitTuning).toHaveBeenLastCalledWith({
      token: 'tok',
      edits: [{path: ['playstyles', 'ramp', 'name'], value: 'Big Ramp', expected: 'Ramp'}],
    });
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

  // Someone renamed Ramp after this editor read tuning.json, so the publish was refused.
  it('drops the edits that no longer apply, keeps the rest, and says how many it dropped', async () => {
    const stale = 'playstyles.ramp.name changed since the editor loaded it (now "Big Ramp"). Reload tuning.json and make the edit again.';
    commitTuning.mockRejectedValue(new Error(stale));
    const result = stageTwo();
    await act(async () => {
      await result.current.publish().catch(() => undefined);
    });
    expect(result.current.error).toBe(stale);

    let dropped = -1;
    act(() => {
      dropped = result.current.dropStale(reloaded('Big Ramp'));
    });
    expect(dropped).toBe(1);
    expect(labels(result.current.pending)).toEqual(['label']);
    expect(result.current.error).toBeNull();
  });

  it('keeps every edit when they all still apply', () => {
    const result = stageTwo();
    let dropped = -1;
    act(() => {
      dropped = result.current.dropStale(reloaded('Ramp'));
    });
    expect(dropped).toBe(0);
    expect(labels(result.current.pending)).toEqual(['label', 'title']);
  });

  it("clears the last publish's outcome", async () => {
    commitTuning.mockResolvedValue({commitUrl: 'https://github.com/x/y/commit/4'});
    const result = stageScores('6');
    await act(async () => {
      await result.current.publish();
    });
    expect(result.current.result).not.toBeNull();

    act(() => {
      result.current.dropStale(reloaded('Ramp'));
    });
    expect(result.current.result).toBeNull();
  });

  it('keeps an edit staged at another path while the reload ran, for the next publish to check', () => {
    const result = stageScores('6');
    const dropStaleAsAsked = result.current.dropStale; // the render the Reload click came from
    act(() => {
      result.current.stageEdit({path: TITLE, rawValue: 'Ramp!', kind: 'text', oldValue: 'Ramp', label: 'title'});
    });

    let dropped = -1;
    act(() => {
      dropped = dropStaleAsAsked(reloaded('Big Ramp'));
    });
    expect(dropped).toBe(0);
    expect(labels(result.current.pending)).toEqual(['label', 'title']);
  });

  it('drops a stale edit typed again while the reload ran, and counts it once', () => {
    const {result} = renderHook(() => useTuningAdmin('tok'));
    act(() => {
      result.current.stageEdit({path: TITLE, rawValue: 'Ramp!', kind: 'text', oldValue: 'Ramp', label: 'title'});
    });
    const dropStaleAsAsked = result.current.dropStale; // the render the Reload click came from
    act(() => {
      result.current.stageEdit({path: TITLE, rawValue: 'Ramp!!', kind: 'text', oldValue: 'Ramp', label: 'title'});
    });

    let dropped = -1;
    act(() => {
      dropped = dropStaleAsAsked(reloaded('Big Ramp'));
    });
    expect(dropped).toBe(1);
    expect(result.current.pending).toEqual([]);
  });
});

// Someone renamed Ramp after this editor read tuning.json.
describe('stillApplies', () => {
  const config = reloaded('Big Ramp');

  it('holds where the reloaded file still has the old value', () => {
    expect(stillApplies({path: PATH, oldValue: 5}, config)).toBe(true);
    expect(stillApplies({path: ['playstyles', 'ramp', 'tagline'], oldValue: 't'}, config)).toBe(true);
  });

  it('fails once the value changed', () => {
    expect(stillApplies({path: TITLE, oldValue: 'Ramp'}, config)).toBe(false);
  });

  it('fails once the path leads nowhere, or only through a string or an inherited key', () => {
    expect(stillApplies({path: ['ruleTexts', 'shift-targets', 'curve.gap9', 'score'], oldValue: 4}, config)).toBe(false);
    // A plain walk would find both: 'Big Ramp'.length is 8, and an object's constructor is named 'Object'.
    expect(stillApplies({path: [...TITLE, 'length'], oldValue: 8}, config)).toBe(false);
    expect(stillApplies({path: ['playstyles', 'constructor', 'name'], oldValue: 'Object'}, config)).toBe(false);
  });
});
