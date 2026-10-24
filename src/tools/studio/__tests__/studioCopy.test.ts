import {afterEach, describe, expect, it, vi} from 'vitest';
import {lorcanaCard} from '../../analytics/cards/cardFixtures';
import {
  PRINTINGS_ONLY_NOTE,
  collectionFailedNote,
  editNote,
  newRevealNote,
  publishLabel,
  saveLabel,
  studioDocumentTitle,
} from '../studioCopy';

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

describe('saveLabel (R4-6b)', () => {
  it('names the branch Edit card saves to, and says while it saves', () => {
    expect(saveLabel({saving: false})).toBe('Save changes to master');
    expect(saveLabel({saving: true})).toBe('Saving…');
  });

  it('names a rehearsal branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(saveLabel({saving: false})).toBe('Save changes to admin-verify');
  });
});

describe('editNote (R4-6b)', () => {
  // The save's own deploy converts the raw scan, so the runbook's 15 to 20 minutes hold for the image too (R-66).
  it('says when the new image goes live, when an image went with the save', () => {
    expect(editNote({withImage: true})).toBe(
      'Vercel is deploying it: allow 15 to 20 minutes before the new image shows on inkweave.ink.',
    );
  });

  it("gives a fields-only save New reveal's note, since it deploys as a new card's does", () => {
    expect(editNote({withImage: false})).toBe(newRevealNote());
    expect(editNote(null)).toBe(newRevealNote());
  });

  it('says a rehearsal branch never deploys, image or not', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(editNote({withImage: true})).toBe('It went to admin-verify; only master deploys to production.');
  });
});

describe('PRINTINGS_ONLY_NOTE (#68)', () => {
  // What Edit card prints under a Set 1 to 8 card's facts: the card rotated out of Core, so its data and art are not admin's to change.
  it('says only the versions of such a card’s printings change in Edit card', () => {
    expect(PRINTINGS_ONLY_NOTE).toBe('A Set 1 to 8 card: only its printings’ versions change here.');
  });
});

describe('collectionFailedNote (#68, #74)', () => {
  // What the search says above itself when the chunks of Sets 1 to 8 couldn't be read: the read that failed, and what it holds.
  it('names the read that failed, and says the search holds Sets 9 and up only', () => {
    expect(collectionFailedNote('/data/collection/3.json: HTTP 500')).toBe(
      "Sets 1 to 8 didn't load (/data/collection/3.json: HTTP 500), so the search holds Sets 9 and up only.",
    );
  });
});
