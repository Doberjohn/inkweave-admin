import {afterEach, describe, expect, it, vi} from 'vitest';
import {loadAgainNote} from '../loadAgainNote';

// vite.config.ts doesn't set unstubEnvs, and the app project shares a worker across files.
afterEach(() => vi.unstubAllEnvs());

describe('loadAgainNote', () => {
  it.each([
    [0, 'Loaded the card again from master. Every edit still applies.'],
    [1, 'Loaded the card again from master. Dropped 1 edit to a field that changed there: make it again.'],
    [3, 'Loaded the card again from master. Dropped 3 edits to fields that changed there: make them again.'],
  ])('with %i dropped, reads "%s" (R-68)', (dropped, note) => {
    expect(loadAgainNote({dropped})).toBe(note);
  });

  it('names a rehearsal branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(loadAgainNote({dropped: 0})).toBe('Loaded the card again from admin-verify. Every edit still applies.');
  });
});
