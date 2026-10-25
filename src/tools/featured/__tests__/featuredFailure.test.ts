import {describe, expect, it} from 'vitest';
import {featuredFailureKind} from '../featuredFailure';
import {StaleFeaturedError} from '../githubClient';

describe('featuredFailureKind', () => {
  it('sorts the stale refusal as stale, so the page offers Reload', () => {
    expect(featuredFailureKind(new StaleFeaturedError('master'))).toBe('stale');
  });

  it('reads stale from the error’s type, never its words', () => {
    expect(featuredFailureKind(new Error(new StaleFeaturedError('master').message))).toBe('other');
  });

  it('sorts a 401 as a rejected token, so the page offers Forget token', () => {
    expect(featuredFailureKind(new Error('GitHub 401 on /repos/Doberjohn/inkweave/contents/x: {"message":"Bad credentials"}'))).toBe(
      'rejected-token',
    );
  });

  it('sorts anything else as other, keeping the picks and Save', () => {
    expect(featuredFailureKind(new Error('master changed while publishing, so nothing was published. Publish again.'))).toBe('other');
    expect(featuredFailureKind('not an error')).toBe('other');
  });
});
