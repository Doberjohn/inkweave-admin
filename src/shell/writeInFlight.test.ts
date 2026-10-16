import {afterEach, describe, expect, it, vi} from 'vitest';
import {writeInFlightMessage} from './writeInFlight';

afterEach(() => vi.unstubAllEnvs());

describe('writeInFlightMessage', () => {
  it.each([
    ['publish', "A publish to master is in progress. Leaving won't stop it, and you won't see whether it landed."],
    ['save', "A save to master is in progress. Leaving won't stop it, and you won't see whether it landed."],
  ] as const)('says leaving a %s in flight neither stops it nor shows how it went', (action, line) => {
    expect(writeInFlightMessage({action})).toBe(line);
  });

  it('names the branch the tools write to', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(writeInFlightMessage({action: 'save'})).toBe(
      "A save to admin-verify is in progress. Leaving won't stop it, and you won't see whether it landed.",
    );
  });
});
