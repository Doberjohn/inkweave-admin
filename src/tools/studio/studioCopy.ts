import {targetBranch} from '../../github/githubCommit';
import {goLiveNote} from '../../github/goLiveNote';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StudioMode} from '../../shell/nav';
import type {EditResult} from './editSave';

/*
 * Card studio's page-level words: its title, its subtitle, New reveal's
 * button, the note after a publish lands, and the tab's name. One module, so
 * the page, its tests and its story say the same thing.
 */

export const STUDIO_TITLE = 'Card studio';

export const STUDIO_SUBTITLE = 'Publish a newly revealed card, or edit a card and its image.';

/** New reveal's button: the branch it commits to, or that it is committing. */
export function publishLabel({publishing}: {publishing: boolean}): string {
  return publishing ? 'Publishing…' : `Publish to ${targetBranch()}`;
}

/**
 * The one go-live sentence on master (R-66): a commit there starts the app's
 * deploy, and the runbook allows 15 to 20 minutes for it (REVEAL_RUNBOOK.md,
 * "One card at a time"). The deploy converts a raw scan itself (build:vercel),
 * so a new image takes the same wait; the convert workflow's own commit
 * deploys nothing (R4-8c).
 */
function deploying(what: string): string {
  return `Vercel is deploying it: allow 15 to 20 minutes before ${what} shows on inkweave.ink.`;
}

/**
 * What follows "Committed." after a New reveal publish: the card goes live
 * with the deploy its commit starts. A rehearsal branch never deploys, and
 * goLiveNote says so instead.
 */
export function newRevealNote(): string {
  return goLiveNote(deploying('it'));
}

/** What names the tab: the mode, and the card Edit card has open (null until one resolves). */
interface TitleSource {
  mode: StudioMode;
  card: LorcanaCard | null;
}

/**
 * The tab's name before " · Inkweave admin" (R-51, R-59): Edit card's open
 * card, so a tab says which card it holds. New reveal, and Edit before its
 * card resolves, read as the page's title.
 */
export function studioDocumentTitle({mode, card}: TitleSource): string | undefined {
  return mode === 'edit' && card ? `${card.fullName} · ${STUDIO_TITLE}` : undefined;
}

/** Edit card's button (R4-6b): the branch it commits to, or that it is saving. */
export function saveLabel({saving}: {saving: boolean}): string {
  return saving ? 'Saving…' : `Save changes to ${targetBranch()}`;
}

/**
 * What follows "Committed." after an Edit save (R4-6b): the same wait as New
 * reveal's, naming the new image when one went with the commit, since that is
 * what the operator waits to see. A fields commit deploys as a new card's
 * does. A rehearsal branch never deploys, and goLiveNote says so.
 */
export function editNote(result: Pick<EditResult, 'withImage'> | null): string {
  return result?.withImage ? goLiveNote(deploying('the new image')) : newRevealNote();
}

/**
 * What Edit card prints under the facts of a card of Sets 1 to 8 (#68). Those sets rotated out of
 * Core, so the card's own data and its art (Ravensburger's) aren't admin's to change: only the
 * versions of its printings are.
 */
export const PRINTINGS_ONLY_NOTE = 'A Set 1 to 8 card: only its printings’ versions change here.';

/**
 * What Edit card's search says when the chunks of Sets 1 to 8 couldn't be read (#68), naming the read
 * that failed (#74): the card list's cards are all it holds.
 */
export function collectionFailedNote(error: string): string {
  return `Sets 1 to 8 didn't load (${error}), so the search holds Sets 9 and up only.`;
}
