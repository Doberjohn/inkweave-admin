import {afterEach, describe, expect, it, vi} from 'vitest';
import {loadAgainNote} from '../loadAgainNote';

// vite.config.ts doesn't set unstubEnvs, and the app project shares a worker across files.
afterEach(() => vi.unstubAllEnvs());

describe('loadAgainNote', () => {
  it.each([
    [0, 'Loaded the card again from master. Every edit still applies.'],
    [1, 'Loaded the card again from master. Dropped 1 edit to a field that changed there: make it again.'],
    [3, 'Loaded the card again from master. Dropped 3 edits to fields that changed there: make them again.'],
  ])('with %i dropped from a draft that still holds an edit, reads "%s" (R-68)', (dropped, note) => {
    expect(loadAgainNote({dropped, edits: true})).toBe(note);
  });

  // R4-8c: "Every edit still applies." only while an edit is left to apply.
  it.each([
    [{}, 'Loaded the card again from master.'],
    [{staged: true}, 'Loaded the card again from master. Your image is still staged.'],
  ])('with no edit left, says only that it read the card, and that a staged image stays: %j', (left, note) => {
    expect(loadAgainNote({dropped: 0, ...left})).toBe(note);
  });

  // The entry read can't be held by the form (R-65), so the card opened image-only: every edit went with the form.
  it.each([
    [1, "Loaded the card again from master. It can't be edited here now, so 1 edit was dropped."],
    [1200, "Loaded the card again from master. It can't be edited here now, so 1,200 edits were dropped."],
  ])('with %i dropped from a card that is no longer editable, reads "%s" (R-65, R-68)', (dropped, note) => {
    expect(loadAgainNote({dropped, editable: false})).toBe(note);
  });

  // The image-only view's "Read previewCards.json again" (R-65): no field edit to keep, whatever the read found.
  it.each([
    [{}, "Loaded the card again from master. It still holds data the form can't."],
    [{staged: true}, "Loaded the card again from master. It still holds data the form can't."],
  ])('says a card still read-only after its re-read still holds data the form can’t: %j', (left, note) => {
    expect(loadAgainNote({dropped: 0, editable: false, ...left})).toBe(note);
  });

  // R4-8f: a read that turned an editable card read-only, with no edit to drop (a stale save's edit discarded).
  // "Still" fits only a card that was read-only before the read, so this says what changed.
  it.each([
    [{}, "Loaded the card again from master. It can't be edited here now, because it holds data the form can't."],
    [{staged: true}, "Loaded the card again from master. It can't be edited here now, because it holds data the form can't."],
  ])('says a card the read turned read-only can’t be edited now: %j', (left, note) => {
    expect(loadAgainNote({dropped: 0, editable: false, wasEditable: true, ...left})).toBe(note);
  });

  it('names a rehearsal branch', () => {
    vi.stubEnv('VITE_ADMIN_TARGET_BRANCH', 'admin-verify');
    expect(loadAgainNote({dropped: 0, edits: true})).toBe('Loaded the card again from admin-verify. Every edit still applies.');
  });
});
