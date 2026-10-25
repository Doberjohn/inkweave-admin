import {describe, expect, it} from 'vitest';
import {outcomeShows} from '../outcomeShows';

const COMMIT = {commitUrl: 'https://github.com/Doberjohn/inkweave/commit/abc123'};

describe('outcomeShows', () => {
  it('is false with nothing to say: no commit, no failure, and no Load it again yet', () => {
    expect(outcomeShows({result: null, error: null, dropped: null})).toBe(false);
    // CommitOutcome's dropped is optional: New card never passes it.
    expect(outcomeShows({result: null, error: null})).toBe(false);
  });

  it.each([
    {what: 'a commit that landed', outcome: {result: COMMIT, error: null, dropped: null}},
    {what: 'a failure', outcome: {result: null, error: 'Server Error', dropped: null}},
    {what: 'a Load it again that dropped nothing', outcome: {result: null, error: null, dropped: 0}},
    {what: 'a Load it again that dropped edits', outcome: {result: null, error: null, dropped: 2}},
  ])('is true for $what, so the outcome line is the one taker of the handoff (R-59)', ({outcome}) => {
    expect(outcomeShows(outcome)).toBe(true);
  });
});
