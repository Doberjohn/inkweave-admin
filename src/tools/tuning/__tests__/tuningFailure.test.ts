import {afterEach, describe, expect, it, vi} from 'vitest';
import {applyTuningEdits, commitTuning, readTuning} from '../githubClient';
import {tuningFailureKind} from '../tuningFailure';

afterEach(() => vi.restoreAllMocks());

/** The message a call fails with. */
async function failureOf(run: () => unknown): Promise<string> {
  try {
    await run();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error('expected the call to fail');
}

/** Every GitHub request answers 401, as it does for an expired token. */
function rejectToken() {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
    new Response('{"message":"Bad credentials","status":"401"}', {status: 401}),
  );
}

describe('tuningFailureKind', () => {
  it("classifies applyTuningEdits' refusal of a changed value as stale-value", async () => {
    const tuning = JSON.stringify({ruleTexts: {ramp: {scores: {density: 7}}}});
    const message = await failureOf(() =>
      applyTuningEdits(tuning, [{path: ['ruleTexts', 'ramp', 'scores', 'density'], value: 6, expected: 5}]),
    );
    expect(tuningFailureKind(message)).toBe('stale-value');
  });

  it('classifies a publish GitHub refuses with 401 as rejected-token', async () => {
    rejectToken();
    const message = await failureOf(() =>
      commitTuning({token: 'old', edits: [{path: ['playstyles', 'ramp', 'name'], value: 'Ramp!', expected: 'Ramp'}]}),
    );
    expect(tuningFailureKind(message)).toBe('rejected-token');
  });

  it('classifies a read of tuning.json GitHub refuses with 401 as rejected-token', async () => {
    rejectToken();
    expect(tuningFailureKind(await failureOf(() => readTuning('old')))).toBe('rejected-token');
  });

  it('classifies a moved branch and other GitHub errors as other', () => {
    expect(tuningFailureKind('master changed while publishing, so nothing was published. Publish again.')).toBe('other');
    expect(tuningFailureKind('GitHub 403 on /repos/Doberjohn/inkweave/git/refs/heads/master: Forbidden')).toBe('other');
    expect(tuningFailureKind('Failed to fetch')).toBe('other');
  });
});
