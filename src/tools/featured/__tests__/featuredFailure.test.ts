import {describe, expect, it} from 'vitest';
import {featuredFailureKind} from '../featuredFailure';
import {staleFeatured} from '../githubClient';

describe('featuredFailureKind', () => {
  it('sorts the stale refusal as stale, so the page offers Reload', () => {
    expect(featuredFailureKind(staleFeatured('master').message)).toBe('stale');
  });

  it('sorts a 401 as a rejected token, so the page offers Forget token', () => {
    expect(featuredFailureKind('GitHub 401 on /repos/Doberjohn/inkweave/contents/x: {"message":"Bad credentials"}')).toBe('rejected-token');
  });

  it('sorts anything else as other, keeping the picks and Save', () => {
    expect(featuredFailureKind('master changed while publishing, so nothing was published. Publish again.')).toBe('other');
  });
});
