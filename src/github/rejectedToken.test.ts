import {afterEach, describe, expect, it, vi} from 'vitest';
import {readRepoFile} from './githubCommit';
import {isRejectedToken} from './rejectedToken';

afterEach(() => vi.restoreAllMocks());

/** The message readRepoFile fails with when GitHub answers `status` with `body`. */
async function readFailure(status: number, body: string): Promise<string> {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, {status}));
  try {
    await readRepoFile('old', 'packages/synergy-engine/src/data/tuning.json');
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error('expected the read to fail');
}

describe('isRejectedToken', () => {
  it('is true for the 401 GitHub answers a token it no longer accepts', async () => {
    expect(isRejectedToken(await readFailure(401, '{"message":"Bad credentials"}'))).toBe(true);
  });

  it('is false for any other status, and for a request GitHub never answered', async () => {
    const forbidden = await readFailure(403, '{"message":"Resource not accessible by personal access token"}');
    expect(isRejectedToken(forbidden)).toBe(false);
    expect(isRejectedToken('Failed to fetch')).toBe(false);
  });
});
