import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {transformRawCards} from '../../app-bridge';
import {targetBranch} from '../../github/githubCommit';
import {REVEAL_SET_CODE} from '../reveal/constants';
import type {EditLookup} from './editorState';
import type {PreviewCardsFile} from './previewCardsFile';

/*
 * Cards only the branch file holds (R-66). The card list is what inkweave.ink
 * serves: allCards.json plus the deployed previewCards.json, read once per
 * session. A card that New reveal publishes, or a /fetch-reveals PR merges,
 * reaches it only once the app deploys, 15 to 20 minutes later
 * (REVEAL_RUNBOOK.md, "One card at a time"), and a rehearsal branch's cards
 * never do. Edit card reads previewCards.json from the target branch itself,
 * so it adds the entries the card list lacks, as R2's rule list adds the
 * tuning.json entries the analytics lack (calibrationModel.ts:67-87).
 */

/** What Edit card reads from the shell's card list (useCardDataContext). */
export interface CardListView {
  cards: LorcanaCard[];
  isLoading: boolean;
  error: Error | null;
  getCardById: (id: string) => LorcanaCard | undefined;
}

/** What editSources adds to the card list. */
export interface BranchOnly {
  /** The ids only the branch file holds: "not deployed yet", with no Card analytics link (R-33). */
  branchOnlyIds: ReadonlySet<number>;
}

/** Edit card's two sources, as editSources hands them on. */
export interface EditSources<L extends CardListView, F extends PreviewCardsFile> {
  /** The cards only the branch file holds, then the card list. getCardById finds both. */
  list: L & BranchOnly;
  /** The branch file, less any entry whose id the card list holds as a released card. */
  file: F;
}

const NONE: ReadonlySet<number> = new Set();

/**
 * Whether the card has a preview id: its set's number times 1000 plus its
 * collector number, or the +900..+999 band for a card revealed without one
 * (the app's revealSet.ts:15-22). allCards.json's ids are sequential and stay
 * clear of every Core set's band, so a card-list card with a preview id came
 * from previewCards.json, and any other from allCards.json. So an image-only
 * save of such a card checks the file still holds it (commitPreviewCardImage),
 * whatever its set (R4-8f).
 */
export function hasPreviewId(card: Pick<LorcanaCard, 'id' | 'setCode'>): boolean {
  const offset = Number(card.id) - Number(card.setCode) * 1000;
  return offset > 0 && offset < 1000;
}

/**
 * Whether the card is a reveal-set card under a preview id: the one kind the
 * branch file decides. Edit opens it only once the file is read. Another
 * set's preview card, during a pin lag, comes from previewCards.json too, but
 * it opens image-only straight from the card list ('other-set' once the file
 * is read, R-65). Any other card, the reveal set's released ones included
 * (graduation gives them official ids), is allCards.json's, and never waits
 * on the file (R-71).
 */
export function isRevealPreview(card: Pick<LorcanaCard, 'id' | 'setCode'>): boolean {
  return card.setCode === REVEAL_SET_CODE && hasPreviewId(card);
}

/** Whether the card list holds the entry's id as allCards.json's card, which wins (the app's loader.ts:212-213). */
function shadowed({entry, list}: {entry: LorcanaJSONCard; list: CardListView}): boolean {
  const listed = list.getCardById(String(entry.id));
  return listed !== undefined && !hasPreviewId(listed);
}

/** The file less the entries allCards.json wins over, so such a card reads Released, image only, everywhere. */
function withoutShadowed<F extends PreviewCardsFile>({list, file}: {list: CardListView; file: F}): F {
  if (file.status !== 'ready') return file;
  const cards = file.cards.filter((entry) => !shadowed({entry, list}));
  if (cards.length === file.cards.length) return file;
  return {...file, cards, ids: new Set(cards.map((entry) => entry.id))};
}

/**
 * The file's entries a loaded card list lacks, built as the app's loader builds
 * a card (transformRawCards), so each has its art's URL, its scan language and
 * its printings. Nothing while either source is loading or failed: an unread
 * card list would make every entry look branch-only.
 */
function branchOnlyCards({list, file}: {list: CardListView; file: PreviewCardsFile}): LorcanaCard[] {
  if (file.status !== 'ready') return [];
  if (list.isLoading) return [];
  if (list.error) return [];
  return transformRawCards(file.cards.filter((entry) => !list.getCardById(String(entry.id))));
}

/**
 * The card list with the branch-only cards first: they are the newest, so a
 * blank query lists them first (R-76). While there are any, every call builds
 * them, the cards array and getCardById anew, so key an effect on card ids,
 * never on these values.
 */
function withBranchCards<L extends CardListView>({list, file}: {list: L; file: PreviewCardsFile}): L & BranchOnly {
  const extra = branchOnlyCards({list, file});
  if (extra.length === 0) return {...list, branchOnlyIds: NONE};
  const byId = new Map(extra.map((card) => [card.id, card]));
  return {
    ...list,
    cards: [...extra, ...list.cards],
    getCardById: (id: string) => list.getCardById(id) ?? byId.get(id),
    branchOnlyIds: new Set(extra.map((card) => Number(card.id))),
  };
}

/**
 * Edit card's sources as it reads them (R-66). The card list gains every
 * branch-file entry it lacks, so the search lists it and the lookup and the
 * draft find it like any other card. The file loses any entry whose id the card
 * list holds as allCards.json's card: the app shows that card, so an id in both
 * reads as Released (loader.ts:212-213). Everything else the two carry, such as
 * retryLoad, reload and commit, passes through.
 */
export function editSources<L extends CardListView, F extends PreviewCardsFile>(sources: {
  list: L;
  file: F;
}): EditSources<L, F> {
  const file = withoutShadowed(sources);
  return {list: withBranchCards({list: sources.list, file}), file};
}

/** Whether inkweave.ink serves the card: false for a card only the branch file holds. */
export function isDeployed({card, branchOnlyIds}: {card: Pick<LorcanaCard, 'id'>; branchOnlyIds: ReadonlySet<number>}): boolean {
  return !branchOnlyIds.has(Number(card.id));
}

/** Whether the open card is deployed; true while no card is open. */
export function deployedOf({lookup, branchOnlyIds}: {lookup: EditLookup; branchOnlyIds: ReadonlySet<number>}): boolean {
  return lookup.kind !== 'ready' || isDeployed({card: lookup.card, branchOnlyIds});
}

/** An id the card list lacks may be one only the file holds: it waits for the file before it is missing. */
function unlistedLookup({lookup, file}: {lookup: EditLookup; file: PreviewCardsFile}): EditLookup {
  if (file.status === 'loading') return {kind: 'loading'};
  if (file.status === 'error') return {kind: 'fileFailed', error: file.error};
  return lookup;
}

/**
 * Whether a ready card is a reveal-set card under a preview id that the file
 * no longer holds. editLookup opens such a card only once the file is read
 * (R-71), so its null entry means the read file lacks it.
 */
function leftFile({card, entry}: {card: LorcanaCard; entry: LorcanaJSONCard | null}): boolean {
  return entry === null && isRevealPreview(card);
}

/**
 * Edit's lookup with what only the branch file can say (R-66), over
 * editLookup's answer from editSources' card list:
 * - an id neither source holds waits for the file before it reads missing, and
 *   a failed read is the file's error, with its Retry. A branch-only card the
 *   file loses reads missing too, since neither source holds it then;
 * - a reveal-set card under a preview id that the file no longer holds is gone.
 *   Graduation releases a card under a new id (R-29) and empties the file,
 *   while inkweave.ink lists the old id until it deploys. On a rehearsal
 *   branch, a preview card published to master after the branch was cut reads
 *   gone too, though it is not released at all (R-86).
 * Neither gets a form or a save: an edit or an image would land on an id the
 * branch file no longer holds. needsSeed drops an open card's draft on either.
 */
export function branchLookup({lookup, file}: {lookup: EditLookup; file: PreviewCardsFile}): EditLookup {
  if (lookup.kind === 'missing') return unlistedLookup({lookup, file});
  if (lookup.kind === 'ready' && leftFile(lookup)) return {kind: 'gone', card: lookup.card};
  return lookup;
}

/**
 * What Edit card shows for a gone card, in place of its form and Save. It
 * leaves the cause open: graduation released the card under a new id, or, on
 * a rehearsal branch, the card was published to master after the branch was
 * cut (R-86), and is not released at all.
 */
export function goneNote(card: Pick<LorcanaCard, 'fullName'>): string {
  return (
    `${card.fullName} is no longer in previewCards.json on ${targetBranch()}, so it can't be saved here. ` +
    'If its set was released, inkweave.ink lists the card under a new id once the release deploys: reload admin then, and find it by name.'
  );
}
