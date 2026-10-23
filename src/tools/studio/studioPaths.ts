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
const DRAFTS = ['reveal', 'edit', 'printing'] as const satisfies readonly Draft[];

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

/** How the studio's lines name a draft. */
interface DraftWords {
  /** Its name, as a line says it mid-sentence: "your New reveal card". */
  name: string;
  /** What it lacks, said after its name: "isn't published yet", or "aren't saved yet" after a plural one. */
  lacks: string;
  /** What stands for it once it is named: "Leaving Card studio drops it." */
  pronoun: 'it' | 'them';
}

/**
 * Each draft's words, in one record: the lines that name a draft when the navigation leaves Card studio,
 * and the confirm before Forget token, are built from them.
 */
const WORDS: Readonly<Record<Draft, DraftWords>> = {
  reveal: {name: 'your New reveal card', lacks: "isn't published yet", pronoun: 'it'},
  edit: {name: 'your Edit card changes', lacks: "aren't saved yet", pronoun: 'them'},
  printing: {name: 'your printing form', lacks: "isn't published yet", pronoun: 'it'},
};

/** A line for each draft, put together from its words. */
function eachDraft(line: (words: DraftWords) => string): Readonly<Record<Draft, string>> {
  return {reveal: line(WORDS.reveal), edit: line(WORDS.edit), printing: line(WORDS.printing)};
}

/** The text with its first letter capitalized, to open a sentence. */
function capitalized(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** What a draft lacks, in the middle of a sentence: "your New reveal card isn't published yet". */
const lacking = ({name, lacks}: DraftWords) => `${name} ${lacks}`;

/** A dirty draft's line when the navigation leaves Card studio: what it lacks, then what leaving drops. */
const LEAVES_STUDIO = eachDraft(
  (words) => `${capitalized(lacking(words))}. Leaving Card studio drops ${words.pronoun}.`,
);

/** What each draft lacks, as the sentence that names several of them at once says it. */
const LACKS = eachDraft(lacking);

/**
 * What leaving Card studio drops, when one sentence names two of the drafts, or all of them: a word for
 * each count. A fourth draft makes the key type's `(typeof DRAFTS)['length']` 4, so the keys become
 * `2 | 4` and TypeScript rejects the `3` below as an unknown key (TS2353). That error is the reminder:
 * whoever adds the draft must then give every count its word by hand.
 */
const DROPS: Readonly<Record<2 | (typeof DRAFTS)['length'], string>> = {2: 'both', 3: 'all three'};

/**
 * Two or three drafts' lines when the navigation leaves Card studio with none
 * of their commits in flight, as one sentence, so "Leaving Card studio drops"
 * isn't said twice (R4-8c): the parts in the order the studio names the
 * drafts, "A, and B" for two and "A, B, and C" for three.
 */
function leavesStudioTogether(dropped: readonly Draft[]): string {
  const lacks = dropped.map((draft) => LACKS[draft]);
  const parts = `${lacks.slice(0, -1).join(', ')}, and ${lacks[lacks.length - 1]}`;
  // A sentence names two drafts at the least (studioUnsavedMessage) and every draft at the most,
  // so its count is one of DROPS' keys.
  const drops = DROPS[dropped.length as keyof typeof DROPS];
  return `${capitalized(parts)}. Leaving Card studio drops ${drops}.`;
}

/**
 * The card's drafts: every draft but New reveal's, which a card change leaves be (draftsAtRisk). Today that
 * is Edit's, and the printing form, which belongs to the card as Edit's draft does (#77). A draft added to
 * the studio counts as one, so LEAVES_CARD fails to compile until it has a line.
 */
type CardDraft = Exclude<Draft, 'reveal'>;

/** A card draft's line when the navigation opens another card, or the search, in the studio. */
const LEAVES_CARD: Readonly<Record<CardDraft, string>> = {
  edit: "Your changes to this card aren't saved yet. Leaving the card drops them.",
  printing: "Your printing form for this card isn't published yet. Leaving the card drops it.",
};

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
 * A held card change that drops no draft outright: each draft it drops went
 * with its own commit. Edit's save landed while the dialog was open, so the
 * change drops nothing (CARD_CLEAN), or it is still in flight, which leaving
 * doesn't stop, and the change drops the edits made since it started, and the
 * save's own changes if it fails, as the in-flight line says (IN_FLIGHT). The
 * printing form's publish in flight is the same (#77): leaving doesn't stop
 * it. Its leave answer names only where it goes (R4-8f). A change that also
 * drops a draft with no commit in flight drops that one outright, so it
 * answers in CARD_CHANGE's words.
 */
const CARD_KEPT: UnsavedWords = {...CARD_CHANGE, leave: 'Leave the card'};

/**
 * A held card change whose card's drafts went clean meanwhile: Edit's save
 * landed, or the printing form closed or went back to what it opened with, by
 * a landed publish or a refusal (#77). A refusal saves nothing, so the line
 * says only that nothing is left to drop. The guard ends a hold only once no
 * draft is dirty, so with New reveal dirty the dialog stays open, and it shows
 * what the message returns.
 */
const CARD_CLEAN = 'Nothing on this card is unsaved now. Leaving the card drops nothing.';

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
  return LEAVES_CARD[draft as CardDraft];
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
  if (dropped.length === 0) return CARD_CLEAN;
  if (dropped.length > 1 && noneInFlight({dropped, busy: leave.busy})) return sharedLine({dropped, leave});
  return dropped.map((draft) => draftLine(draft, leave)).join(' ');
}

/**
 * Whether a card change drops edits outright: it drops the Edit draft, the
 * printing form, or both, and one it drops has no commit in flight to keep
 * its edits. A draft whose commit is in flight keeps what it sent, and its
 * line says what the change still drops (IN_FLIGHT).
 */
function dropsOutright(leave: StudioLeave): boolean {
  return draftsDropped(leave).some((draft) => !leave.busy[draft]);
}

/**
 * UnsavedChangesGuard's message for the studio: studioUnsavedMessage's line.
 * A card change stays on the page, so it asks about the card (CARD_CHANGE),
 * and says "Drop changes" whenever it drops a draft outright, one with no
 * commit in flight, even beside another whose commit is in flight (R4-8f),
 * and "Leave the card" otherwise (CARD_KEPT); leaving Card studio asks in the
 * guard's own words, "Leave this page?" (R4-8c).
 */
export function studioUnsavedQuestion(leave: StudioLeave): string | UnsavedQuestion {
  const message = studioUnsavedMessage(leave);
  if (!staysInStudio(leave)) return message;
  return {...(dropsOutright(leave) ? CARD_CHANGE : CARD_KEPT), message};
}

/** How the confirm before Forget token names each draft. */
const DRAFT_NAMES = eachDraft(({name}) => name);

/** Names as a list: "A", "A and B", or "A, B, and C". */
function listOf(names: readonly string[]): string {
  if (names.length < 3) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

/**
 * What the in-page Forget token asks first (R-84), or null when no draft is
 * dirty: the workspace is keyed by the token, so forgetting it drops every
 * draft, as TuningAside's confirmForget words it for tuning edits.
 */
export function forgetTokenQuestion(drafts: StudioDrafts): string | null {
  const names = DRAFTS.filter((draft) => drafts[draft]).map((draft) => DRAFT_NAMES[draft]);
  return names.length > 0 ? `Forget the token and drop ${listOf(names)}?` : null;
}
