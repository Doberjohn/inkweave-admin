import {afterEach, describe, it, expect, vi} from 'vitest';
import {goLiveNote} from './goLiveNote';

afterEach(() => vi.unstubAllEnvs());

describe('goLiveNote', () => {
  it('says how the change goes live when the tools target master', () => {
    expect(goLiveNote('Vercel is deploying.')).toBe('Vercel is deploying.');
  });

  it('says a rehearsal branch never reaches production', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(goLiveNote('Vercel is deploying.')).toBe('It went to admin-verify; only master deploys to production.');
  });
});
