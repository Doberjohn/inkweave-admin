import type {Location} from 'react-router-dom';
import type {StudioMode} from '../../shell/nav';
import type {UnsavedQuestion, UnsavedWords} from '../../shell/UnsavedChangesGuard';
import {writeInFlightMessage} from '../../shell/writeInFlight';

/**
 * The parts of a location the studio reads. react-router's Location fits, and
 * so does a URL, which is how the tests build one.
 */
export type StudioLocation = Pick<Location, 'pathname' | 'search'>;

/**
 * Which drafts hold unsaved edits: New reveal's form, Edit card's, and Edit
 * card's promo printing form (#77), which the workspace holds beside Edit's draft.
 */
export interface StudioDrafts {
  reveal: boolean;
  edit: boolean;
  printing: boolean;
}

type Draft = keyof StudioDrafts;

/** The drafts in the order the studio names them. */
const DRAFTS: readonly Draft[] = ['reveal', 'edit', 'printing'];

const NOTHING_AT_RISK: StudioDrafts = {reveal: false, edit: false, printing: false};

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
 * - Inside it, another card, or none, drops the Edit draft and the printing
 *   form, which are the card's: the editor is keyed by the card (R-59), and
 *   the printing form goes with it (#77). New reveal's draft isn't.
 * - A mode switch drops nothing: every draft stays mounted, and studioHref
 *   keeps the card (R-57).
 */
export function draftsAtRisk(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): StudioDrafts {
  if (from.pathname !== to.pathname) return dirty;
  if (studioCardOf(from) === studioCardOf(to)) return NOTHING_AT_RISK;
  return {...dirty, reveal: false};
}

/**
 * UnsavedChangesGuard's `leaves` for the studio: whether the navigation would
 * drop a draft. The page passes it each draft's `dirty` (R2-5a's hand-off).
 */
export function shouldBlockStudioNavigation(from: StudioLocation, to: StudioLocation, dirty: StudioDrafts): boolean {
  const atRisk = draftsAtRisk(from, to, dirty);
  return DRAFTS.some((draft) => atRisk[draft]);
}

/** A navigation the guard holds, as the studio words its question (R-58). */
export interface StudioLeave {
  from: StudioLocation;
  to: StudioLocation;
  /** Each draft's dirty. */
  drafts: StudioDrafts;
  /** Each draft's commit in flight: New reveal's publish, Edit card's save, the printing form's publish. */
  busy: StudioDrafts;
}

/** The line for a publish in flight, which New reveal's and the printing form's share. */
const publishInFlight = () => writeInFlightMessage({action: 'publish'});

/**
 * Each draft's line while its commit is in flight: R2's shared sentence
 * (writeInFlight.ts), built when asked for, since it names the branch. Edit's
 * adds what leaving still drops. The form stays editable while a save runs,
 * and a landed save makes only what it sent the baseline (useEditSave's land,
 * savedDraft), so edits typed since it started stay in the draft that leaving
 * drops; and a failed save's own changes are lost with that draft. "Any"
 * keeps the line true when there are no later edits. The printing form locks
 * while its publish runs (PromoPrintingForm), so its line adds nothing.
 */
const IN_FLIGHT: Readonly<Record<Draft, () => string>> = {
  reveal: publishInFlight,
  edit: () =>
    `${writeInFlightMessage({action: 'save'})} ` +
    'Any edits made since the save started are dropped, and if the save fails, its changes are lost too.',
  printing: publishInFlight,
};

/** A dirty draft's line when the navigation leaves Card studio. */
const LEAVES_STUDIO: Readonly<Record<Draft, string>> = {
  reveal: "Your New reveal card isn't published yet. Leaving Card studio drops it.",
  edit: "Your Edit card changes aren't saved yet. Leaving Card studio drops them.",
  printing: "Your printing form isn't published yet. Leaving Card studio drops it.",
};

/**
 * What each draft lacks, as the sentence that names several of them at once
 * says it: the first half of its line above, in the middle of a sentence.
 */
const LACKS: Readonly<Record<Draft, string>> = {
  reveal: "your New reveal card isn't published yet",
  edit: "your Edit card changes aren't saved yet",
  printing: "your printing form isn't published yet",
};

/** What leaving Card studio drops, when one sentence names two of the drafts, or all three. */
const DROPS: Readonly<Record<number, string>> = {2: 'both', 3: 'all three'};

/**
 * Two or three drafts' lines when the navigation leaves Card studio with none
 * of their commits in flight, as one sentence, so "Leaving Card studio drops"
 * isn't said twice (R4-8c): the parts in the order the studio names the
 * drafts, "A, and B" for two and "A, B, and C" for three.
 */
function leavesStudioTogether(dropped: readonly Draft[]): string {
  const lacks = dropped.map((draft) => LACKS[draft]);
  const parts = `${lacks.slice(0, -1).join(', ')}, and ${lacks[lacks.length - 1]}`;
  return `${parts.charAt(0).toUpperCase()}${parts.slice(1)}. Leaving Card studio drops ${DROPS[lacks.length]}.`;
}

/** The Edit draft's line when the navigation opens another card, or the search, in the studio. */
const LEAVES_CARD = "Your changes to this card aren't saved yet. Leaving the card drops them.";

/** The printing form's line when it does: the form belongs to the card, as Edit's draft does (#77). */
const LEAVES_CARD_PRINTING = "Your printing form for this card isn't published yet. Leaving the card drops it.";

/**
 * Both lines as one sentence, neither commit in flight (R4-8c). A card change
 * drops no other pair (draftsAtRisk), so "it" is the card the first part names.
 */
const LEAVES_CARD_BOTH =
  "Your changes to this card aren't saved yet, and your printing form for it isn't published yet. Leaving the card drops both.";

/**
 * A held card change's title and answers (R4-8c): it stays on the page, so it
 * asks about the card. Leaving Card studio keeps the guard's own words.
 */
const CARD_CHANGE: UnsavedWords = {title: 'Leave this card?', stay: 'Keep editing', leave: 'Drop changes'};

/**
 * A held card change whose edits went with the card's save: it landed while
 * the dialog was open, so the change drops nothing (CARD_SAVED), or it is
 * still in flight, which leaving doesn't stop, and the change drops the edits
 * made since it started, and the save's own changes if it fails, as the
 * in-flight line says (IN_FLIGHT). The printing form's publish in flight is
 * the same (#77): leaving doesn't stop it, so the answer doesn't claim to drop
 * it. Its leave answer names only where it goes (R4-8f).
 */
const CARD_KEPT: UnsavedWords = {...CARD_CHANGE, leave: 'Leave the card'};

/**
 * A held card change whose Edit draft went clean meanwhile: its save landed.
 * The guard ends a hold only once no draft is dirty, so with New reveal
 * dirty the dialog stays open, and it shows what the message returns.
 */
const CARD_SAVED = 'Your changes to this card are saved. Leaving the card drops nothing.';

/** Whether the navigation stays in the studio: another card, or none, rather than another page. */
function staysInStudio({from, to}: StudioLeave): boolean {
  return from.pathname === to.pathname;
}

/** The drafts the navigation drops (draftsAtRisk, the hold's own rule), in the order the studio names them. */
function draftsDropped(leave: StudioLeave): Draft[] {
  const atRisk = draftsAtRisk(leave.from, leave.to, leave.drafts);
  return DRAFTS.filter((draft) => atRisk[draft]);
}

/** Whether none of `dropped` has its commit in flight. */
function noneInFlight({dropped, busy}: {dropped: readonly Draft[]; busy: StudioDrafts}): boolean {
  return dropped.every((draft) => !busy[draft]);
}

/** One draft's line: its commit in flight, or what the navigation drops. */
function draftLine(draft: Draft, leave: StudioLeave): string {
  if (leave.busy[draft]) return IN_FLIGHT[draft]();
  if (!staysInStudio(leave)) return LEAVES_STUDIO[draft];
  // The Edit draft and the printing form are the card's, so the only drafts a card change drops (draftsAtRisk).
  return draft === 'printing' ? LEAVES_CARD_PRINTING : LEAVES_CARD;
}

/**
 * The sentence that two or more dropped drafts share, none with its commit in
 * flight: leaving names each, and a card change names the card's two.
 */
function sharedLine({dropped, leave}: {dropped: readonly Draft[]; leave: StudioLeave}): string {
  return staysInStudio(leave) ? LEAVES_CARD_BOTH : leavesStudioTogether(dropped);
}

/**
 * The guard's line for the studio (R-58): a line for each draft the held
 * navigation would drop (draftsAtRisk, the hold's own rule), so a card change
 * names only the Edit draft and the printing form and leaving names every dirty
 * one: two or three in one sentence while none of their commits is in flight.
 * A draft whose commit is in flight gets its in-flight line instead
 * (IN_FLIGHT), and the others their own. It never returns '': a hold can
 * outlast the draft it protects (R4-5s).
 */
export function studioUnsavedMessage(leave: StudioLeave): string {
  const dropped = draftsDropped(leave);
  if (dropped.length === 0) return CARD_SAVED;
  if (dropped.length > 1 && noneInFlight({dropped, busy: leave.busy})) return sharedLine({dropped, leave});
  return dropped.map((draft) => draftLine(draft, leave)).join(' ');
}

/**
 * Whether a card change drops edits outright: it drops the Edit draft's, the
 * printing form, or both, and neither has a commit in flight. While one does,
 * its line says what the change still drops (IN_FLIGHT).
 */
function dropsOutright(leave: StudioLeave): boolean {
  const dropped = draftsDropped(leave);
  return dropped.length > 0 && noneInFlight({dropped, busy: leave.busy});
}

/**
 * UnsavedChangesGuard's message for the studio: studioUnsavedMessage's line.
 * A card change stays on the page, so it asks about the card (CARD_CHANGE),
 * and says "Drop changes" only while it drops edits outright, with no commit
 * of theirs in flight (CARD_KEPT, R4-8f); leaving Card studio asks in the
 * guard's own words, "Leave this page?" (R4-8c).
 */
export function studioUnsavedQuestion(leave: StudioLeave): string | UnsavedQuestion {
  const message = studioUnsavedMessage(leave);
  if (!staysInStudio(leave)) return message;
  return {...(dropsOutright(leave) ? CARD_CHANGE : CARD_KEPT), message};
}

/** How the confirm before Forget token names each draft. */
const DRAFT_NAMES: Readonly<Record<Draft, string>> = {
  reveal: 'your New reveal card',
  edit: 'your Edit card changes',
  printing: 'your printing form',
};

/**
 * What the in-page Forget token asks first (R-84), or null when no draft is
 * dirty: the workspace is keyed by the token, so forgetting it drops every
 * draft, as TuningAside's confirmForget words it for tuning edits.
 */
export function forgetTokenQuestion(drafts: StudioDrafts): string | null {
  const names = DRAFTS.filter((draft) => drafts[draft]).map((draft) => DRAFT_NAMES[draft]);
  return names.length > 0 ? `Forget the token and drop ${names.join(' and ')}?` : null;
}
