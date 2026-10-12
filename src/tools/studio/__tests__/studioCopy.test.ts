import {afterEach, describe, expect, it, vi} from 'vitest';
import {lorcanaCard} from '../../analytics/cards/cardFixtures';
import {newRevealNote, publishLabel, studioDocumentTitle} from '../studioCopy';

afterEach(() => vi.unstubAllEnvs());

describe('publishLabel', () => {
  it('names the branch New reveal commits to, and says while it commits', () => {
    expect(publishLabel({publishing: false})).toBe('Publish to master');
    expect(publishLabel({publishing: true})).toBe('Publishing…');
  });

  it('names a rehearsal branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(publishLabel({publishing: false})).toBe('Publish to admin-verify');
  });
});

describe('newRevealNote', () => {
  it("allows the runbook's 15 to 20 minutes for the deploy (R-66)", () => {
    expect(newRevealNote()).toBe('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.');
  });

  it('says a rehearsal branch never deploys', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(newRevealNote()).toBe('It went to admin-verify; only master deploys to production.');
  });
});

describe('studioDocumentTitle', () => {
  const ELSA = lorcanaCard({id: '2983', name: 'Elsa', version: 'Snow Queen', setCode: '9', setNumber: 42});

  it('names the tab after the card Edit card has open (R-51)', () => {
    expect(studioDocumentTitle({mode: 'edit', card: ELSA})).toBe('Elsa - Snow Queen · Card studio');
  });

  it.each([
    ['New reveal, whatever card the URL keeps', 'new', ELSA],
    ['Edit card before its card resolves', 'edit', null],
  ] as const)('leaves the page title on %s', (_case, mode, card) => {
    expect(studioDocumentTitle({mode, card})).toBeUndefined();
  });
});
