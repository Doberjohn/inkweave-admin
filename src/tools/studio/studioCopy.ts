import {targetBranch} from '../../github/githubCommit';
import {goLiveNote} from '../../github/goLiveNote';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StudioMode} from '../../shell/nav';

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
 * What follows "Committed." after a New reveal publish (R-66): the card's
 * commit starts the app's deploy, and the runbook allows 15 to 20 minutes for
 * it (REVEAL_RUNBOOK.md, "One card at a time"). A rehearsal branch never
 * deploys, and goLiveNote says so instead.
 */
export function newRevealNote(): string {
  return goLiveNote('Vercel is deploying it: allow 15 to 20 minutes before it shows on inkweave.ink.');
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
