import type {Location} from 'react-router-dom';
import type {StudioMode} from '../../shell/nav';
import {writeInFlightMessage, type WriteInFlight} from '../../shell/writeInFlight';

/**
 * The parts of a location the studio reads. react-router's Location fits, and
 * so does a URL, which is how the tests build one.
 */
export type StudioLocation = Pick<Location, 'pathname' | 'search'>;

/** Which drafts hold unsaved edits: New reveal's form and Edit card's. */
export interface StudioDrafts {
  reveal: boolean;
  edit: boolean;
}

const NOTHING_AT_RISK: StudioDrafts = {reveal: false, edit: false};

const paramsOf = (location: StudioLocation) => new URLSearchParams(location.search);

/** The mode a studio URL opens: ?mode=edit is Edit card, anything else New reveal (studioHref's reverse). */
export function studioModeOf(location: StudioLocation): StudioMode {
  return paramsOf(location).get('mode') === 'edit' ? 'edit' : 'new';
}

/** The card a studio URL names (?card=), or null. An empty ?card= names none, as studioHref writes none. */
export function studioCardOf(location: StudioLocation): string | null {
  return paramsOf(location).get('card') || null;
}

/**
 * The drafts a navigation from `from` to `to` would drop (R-57, R-58).
 * - Leaving /studio drops every dirty draft.
 * - Inside it, another card, or none, drops the Edit draft: the editor is keyed
 *   by the card (R-59).
 * - A mode switch drops nothing: both drafts stay mounted, and studioHref keeps
 *   the card (R-57).
 */
export function draftsAtRisk(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): StudioDrafts {
  if (from.pathname !== to.pathname) return dirty;
  if (studioCardOf(from) === studioCardOf(to)) return NOTHING_AT_RISK;
  return {reveal: false, edit: dirty.edit};
}

/**
 * UnsavedChangesGuard's `leaves` for the studio: whether the navigation would
 * drop a draft. The page passes it the two drafts' `dirty` (R2-5a's hand-off).
 */
export function shouldBlockStudioNavigation(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): boolean {
  const atRisk = draftsAtRisk(from, to, dirty);
  return atRisk.reveal || atRisk.edit;
}

/** A navigation the guard holds, as the studio words its question (R-58). */
export interface StudioLeave {
  from: StudioLocation;
  to: StudioLocation;
  /** Each draft's dirty. */
  drafts: StudioDrafts;
  /** Each draft's commit in flight: New reveal's publish, Edit card's save. */
  busy: StudioDrafts;
}

type Draft = keyof StudioDrafts;

/** The drafts in the order the studio names them. */
const DRAFTS: readonly Draft[] = ['reveal', 'edit'];

/** Each draft's commit, in R2's shared in-flight line (writeInFlight.ts). */
const COMMIT: Readonly<Record<Draft, WriteInFlight>> = {reveal: {action: 'publish'}, edit: {action: 'save'}};

/** A dirty draft's line when the navigation leaves Card studio. */
const LEAVES_STUDIO: Readonly<Record<Draft, string>> = {
  reveal: "Your New reveal card isn't published yet. Leaving Card studio drops it.",
  edit: "Your Edit card changes aren't saved yet. Leaving Card studio drops them.",
};

/** The Edit draft's line when the navigation opens another card, or the search, in the studio. */
const LEAVES_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";

/**
 * A held card change whose Edit draft went clean meanwhile: its save landed.
 * The guard ends a hold only once neither draft is dirty, so with New reveal
 * dirty the dialog stays open, and it shows what the message returns.
 */
const CARD_SAVED = 'Your changes to this card are saved. Leaving the card drops nothing.';

/** One draft's line: its commit in flight, or what the navigation drops. */
function draftLine(draft: Draft, leave: StudioLeave): string {
  if (leave.busy[draft]) return writeInFlightMessage(COMMIT[draft]);
  return leave.from.pathname === leave.to.pathname ? LEAVES_CARD : LEAVES_STUDIO[draft];
}

/**
 * UnsavedChangesGuard's message for the studio (R-58): a line for each draft
 * the held navigation would drop (draftsAtRisk, the hold's own rule), so a
 * card change names only the Edit draft and leaving names every dirty one. A
 * draft whose commit is in flight gets the shared in-flight line instead. It
 * never returns '': a hold can outlast the draft it protects (R4-5s).
 */
export function studioUnsavedMessage(leave: StudioLeave): string {
  const atRisk = draftsAtRisk(leave.from, leave.to, leave.drafts);
  const lines = DRAFTS.filter((draft) => atRisk[draft]).map((draft) => draftLine(draft, leave));
  return lines.length > 0 ? lines.join(' ') : CARD_SAVED;
}

/** How the confirm before Forget token names each draft. */
const DRAFT_NAMES: Readonly<Record<Draft, string>> = {reveal: 'your New reveal card', edit: 'your Edit card changes'};

/**
 * What the in-page Forget token asks first (R-84), or null when no draft is
 * dirty: the workspace is keyed by the token, so forgetting it drops both
 * drafts, as TuningAside's confirmForget words it for tuning edits.
 */
export function forgetTokenQuestion(drafts: StudioDrafts): string | null {
  const names = DRAFTS.filter((draft) => drafts[draft]).map((draft) => DRAFT_NAMES[draft]);
  return names.length > 0 ? `Forget the token and drop ${names.join(' and ')}?` : null;
}
