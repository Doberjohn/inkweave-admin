import type {LorcanaCard, LorcanaJSONCard, SynergyGroup} from 'inkweave-synergy-engine';
import type {useCardDataContext} from '../../app-bridge';
import type {ImageUpload} from '../../components/useImageUpload';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {buildPreview, computeSynergies, type ChosenImage} from '../reveal/livePreview';
import type {PreviewCardChanges} from '../reveal/replaceCardInPreviewJson';
import type {ValidationResult} from '../reveal/validateForm';
import {isRevealPreview} from './branchCards';
import {cardChanges, editKindOf, formFromPreviewCard, validateCardEdit, type ImageOnlyReason} from './cardEdit';
import type {CardTag} from './editSearch';
import type {PreviewCardsFile} from './previewCardsFile';

/*
 * Edit card's state, as pure functions of what the editor reads: the shell's
 * card list, previewCards.json on the target branch, the draft and the upload.
 * useCardEditor only wires them together, as useRevealAdmin does, so each rule
 * is tested here without React.
 */

/** What the editor reads from the shell's card list (useCardDataContext), as cardPageState does. */
export type CardListState = Pick<ReturnType<typeof useCardDataContext>, 'isLoading' | 'error' | 'getCardById'>;

/**
 * The open card. `imageOnly` says why a card opens without its fields (R-61,
 * R-65), null when they are editable; `entry` is its previewCards.json entry,
 * null for a card the file doesn't hold.
 */
export type EditLookup =
  | {kind: 'listFailed'; error: Error}
  | {kind: 'none'}
  | {kind: 'loading'}
  | {kind: 'missing'; cardId: string}
  | {kind: 'fileFailed'; error: string}
  // R4-4d (R-66): a reveal-set card under a preview id that the read file no longer holds (branchLookup)
  | {kind: 'gone'; card: LorcanaCard}
  | {kind: 'ready'; card: LorcanaCard; entry: LorcanaJSONCard | null; imageOnly: ImageOnlyReason | null};

export interface LookupInput {
  /** The URL's card id (?card=), or null. */
  cardId: string | null;
  list: CardListState;
  file: PreviewCardsFile;
}

/** The card's entry in the file, once the file is read. The card list's ids are strings; the file's are numbers. */
function entryOf({card, file}: {card: LorcanaCard; file: PreviewCardsFile}): LorcanaJSONCard | null {
  if (file.status !== 'ready') return null;
  return file.cards.find((entry) => String(entry.id) === card.id) ?? null;
}

/** The card, ready: R4-2a's editKindOf decides from its entry whether its fields open (R-65). */
function opened({card, file}: {card: LorcanaCard; file: PreviewCardsFile}): EditLookup {
  const entry = entryOf({card, file});
  const edit = editKindOf(entry);
  return {kind: 'ready', card, entry, imageOnly: edit.kind === 'image' ? edit.reason : null};
}

/**
 * A card the list holds. Only a reveal-set card under a preview id waits for
 * the file, which says whether it is still a preview card (isRevealPreview).
 * Any other card is released and image-only straight from the list: a card of
 * another set, and one of the reveal set under its official id, as graduation
 * leaves them (Doberjohn/inkweave#780). So image fixes never wait on the file
 * or its errors (R-71). The lookup's reason becomes 'other-set' once the file,
 * read, holds a card of another set (a pin lag, R-65). Its draft, seeded as
 * released, isn't seeded again, so the page reads the reason through
 * imageOnlyOf.
 */
function cardLookup({card, file}: {card: LorcanaCard; file: PreviewCardsFile}): EditLookup {
  if (!isRevealPreview(card)) return opened({card, file});
  if (file.status === 'loading') return {kind: 'loading'};
  if (file.status === 'error') return {kind: 'fileFailed', error: file.error};
  return opened({card, file});
}

/**
 * The open card, decided in cardPageState's order (R3):
 * 1. A failed card list, with no card open too: the search has nothing to search.
 * 2. No card: the search.
 * 3. A list still loading.
 * 4. An id the list doesn't hold.
 * 5. For a reveal-set card under a preview id, the file loading, then its failed read.
 * 6. The card.
 * The card is looked up here, during render, with the list's getCardById.
 */
export function editLookup({cardId, list, file}: LookupInput): EditLookup {
  if (list.error) return {kind: 'listFailed', error: list.error};
  if (!cardId) return {kind: 'none'};
  if (list.isLoading) return {kind: 'loading'};
  const card = list.getCardById(cardId);
  if (!card) return {kind: 'missing', cardId};
  return cardLookup({card, file});
}

/** A preview card's field edit: its entry and form as loaded, and the form now. */
export interface FieldsEdit {
  kind: 'fields';
  /** The entry the form was built from: what a save diffs against, and what its base check compares (R-67). */
  loaded: LorcanaJSONCard;
  /** The form as loaded: what Discard puts back. */
  before: RevealCardForm;
  form: RevealCardForm;
}

/** A card that opens image-only, and why. */
export interface ImageOnlyEdit {
  kind: 'image';
  reason: ImageOnlyReason;
}

/**
 * One card's edit. There is no ref and no reset effect: the editor seeds a new
 * draft during render when the card changes, or when the read a waiting draft
 * follows lands (needsSeed).
 */
export interface Draft {
  /** The card it belongs to. */
  cardId: string | null;
  /** Bumped on every seed, so whatever was started for an older draft (an image choice; a save, R4-4c) can tell. */
  seed: number;
  /** The read of previewCards.json it was seeded from; null when it was seeded without one. */
  read: number | null;
  /**
   * Seed again once the card is ready on a newer read: while it waits, after
   * Load it again (R4-4c), and after a read that left the card out of the file
   * (gone or missing, R-66; needsSeed).
   */
  follow: boolean;
  /**
   * Null until the card's lookup is ready, and again once a read leaves the
   * card out of the file (R-66). A draft keeps the kind it was seeded with.
   */
  edit: FieldsEdit | ImageOnlyEdit | null;
  /**
   * The file chosen for this draft. The upload hook holds its bytes; the
   * draft only says whose they are, so a new card never shows the last one's
   * image and nothing calls upload.choose(null) during render.
   */
  image: File | null;
  /**
   * How many field edits the last same-card re-seed dropped: a "Load it again"
   * (R-68, R4-4c), or a read that left the card out of the file (gone or
   * missing, R-66; needsSeed). Unset until one lands on this draft.
   */
  dropped?: number;
  /** What that re-seed kept, set with `dropped`. */
  kept?: KeptEdits;
}

/**
 * What a same-card re-seed kept, recorded as its read lands (R4-8c): Load it
 * again's line says what the read left, so an edit made after it never reads
 * as one that "still applies". Discard and Revert image take back what they
 * drop, so the line never names an edit or an image that has gone since
 * (R4-8f).
 */
export interface KeptEdits {
  /** A field edit (hasEdits on the draft's changes). */
  edits: boolean;
  /** A staged image. */
  staged: boolean;
  /**
   * The card opened with its fields before the read (R4-8f): a read that
   * leaves it read-only says it "still" holds data the form can't only when
   * it already did.
   */
  wasEditable: boolean;
}

/** What the draft opens with: the fields of an editable entry, the reason for any other card, null while it waits. */
function editOf(lookup: EditLookup): Draft['edit'] {
  if (lookup.kind !== 'ready') return null;
  if (lookup.imageOnly !== null) return {kind: 'image', reason: lookup.imageOnly};
  // editKindOf(null) is released, so an editable card has an entry; this narrows the type.
  if (lookup.entry === null) return {kind: 'image', reason: 'released'};
  const form = formFromPreviewCard(lookup.entry);
  return {kind: 'fields', loaded: lookup.entry, before: form, form};
}

function readOf(file: PreviewCardsFile): number | null {
  return file.status === 'ready' ? file.read : null;
}

export interface SeedInput {
  cardId: string | null;
  lookup: EditLookup;
  file: PreviewCardsFile;
  seed: number;
}

/**
 * A fresh draft for the card: its form when its fields are editable, built
 * only for an editable entry (editKindOf's rule, R-65), and no image.
 */
export function seedDraft({cardId, lookup, file, seed}: SeedInput): Draft {
  const edit = editOf(lookup);
  return {cardId, seed, read: edit === null ? null : readOf(file), follow: edit === null, edit, image: null};
}

/** A read newer than the one the draft was seeded from has landed. */
function newerRead({draft, file}: {draft: Draft; file: PreviewCardsFile}): boolean {
  if (draft.read === null) return true;
  return file.status === 'ready' && file.read > draft.read;
}

/**
 * Whether this render must seed a new draft: the URL names another card, or
 * the draft follows reads and its card is now ready on a newer one. A later
 * read never touches a draft that doesn't follow, so edits survive a reload,
 * unless it leaves the open card out of the file (R-66, branchLookup): gone
 * while the card list holds it, missing when only the file did. Neither has a
 * form, a file control or a save, so a draft that still holds an edit, a
 * field edit or an image-only one, is seeded once more. That drops the edit
 * (keepEdits counts it), the staged image (reseeded) and the outcome. The
 * draft then holds nothing, so the next render settles, and it follows reads
 * again, so the card's fields come back if the file holds it again. An
 * unknown id's draft is seeded missing, with no edit, so it settles at once.
 */
export function needsSeed({draft, cardId, lookup, file}: Omit<SeedInput, 'seed'> & {draft: Draft}): boolean {
  if (draft.cardId !== cardId) return true;
  if (lookup.kind === 'gone' || lookup.kind === 'missing') return draft.edit !== null;
  if (!draft.follow || lookup.kind !== 'ready') return false;
  return newerRead({draft, file});
}

/** The draft's field edit, or null for an image-only or waiting draft. */
export function fieldsOf(draft: Draft): FieldsEdit | null {
  return draft.edit?.kind === 'fields' ? draft.edit : null;
}

/** What the editor shows of the draft: its form and entry for a field edit, else why the card is image-only. */
export interface DraftView {
  form: RevealCardForm | null;
  loaded: LorcanaJSONCard | null;
  /** The reason the draft was seeded with. The page shows imageOnlyOf's, which follows the lookup. */
  imageOnly: ImageOnlyReason | null;
}

export function draftView({edit}: Draft): DraftView {
  if (edit?.kind === 'fields') return {form: edit.form, loaded: edit.loaded, imageOnly: null};
  return {form: null, loaded: null, imageOnly: edit?.kind === 'image' ? edit.reason : null};
}

/**
 * Why the open card shows no form (R-61, R-65): what the page reads. Null for
 * a field edit and while the card waits. An image draft keeps its kind, but
 * its reason is the lookup's while that is ready, so a card of another set,
 * opened as released before previewCards.json landed, reads 'other-set' once
 * the file holds it (a pin lag), with its staged image kept. A ready lookup
 * with no reason (its entry now has fields) leaves the draft's own: the draft
 * has no form to show.
 */
export function imageOnlyOf({draft, lookup}: {draft: Draft; lookup: EditLookup}): ImageOnlyReason | null {
  const seeded = draftView(draft).imageOnly;
  if (seeded === null) return null;
  const current = lookup.kind === 'ready' ? lookup.imageOnly : null;
  return current ?? seeded;
}

/** The open card, once its lookup is ready. */
export function openCard(lookup: EditLookup): LorcanaCard | null {
  return lookup.kind === 'ready' ? lookup.card : null;
}

/**
 * The open card's tag. It is cardTag's answer (editSearch.ts): a ready card
 * holds an entry exactly when the file, read, holds its id.
 */
export function openTag(lookup: EditLookup): CardTag | null {
  if (lookup.kind !== 'ready') return null;
  return lookup.entry === null ? 'Released' : 'Preview';
}

/** The patch applied to the form. The collector number stays as loaded: Edit never renumbers (R-91). */
export function patchDraft(draft: Draft, patch: Partial<RevealCardForm>): Draft {
  const fields = fieldsOf(draft);
  if (fields === null) return draft;
  const form = {...fields.form, ...patch, collectorNumber: fields.before.collectorNumber};
  return {...draft, edit: {...fields, form}};
}

/** What the last re-read kept, less what an action has just dropped; nothing for a draft no re-read landed on. */
function keptLess(draft: Draft, gone: Partial<KeptEdits>): Pick<Draft, 'kept'> {
  return draft.kept ? {kept: {...draft.kept, ...gone}} : {};
}

/** The form as loaded, and no image (Discard): the last re-read's line no longer says either stays. */
export function discardDraft(draft: Draft): Draft {
  const fields = fieldsOf(draft);
  const edit = fields === null ? draft.edit : {...fields, form: fields.before};
  return {...draft, edit, image: null, ...keptLess(draft, {edits: false, staged: false})};
}

/** No staged image (Revert image): the last re-read's line no longer says one stays. */
export function revertDraftImage(draft: Draft): Draft {
  return {...draft, image: null, ...keptLess(draft, {staged: false})};
}

/** The draft with this image staged, if it is still the draft it was chosen in. */
export function stageImage(draft: Draft, choice: {seed: number; image: File | null}): Draft {
  return draft.seed === choice.seed ? {...draft, image: choice.image} : draft;
}

const NOTHING_STAGED: ChosenImage = {name: null, dataUrl: null, error: null};

/**
 * The staged image as the editor shows it: the upload, when it holds this
 * draft's file, as the ChosenImage both controllers derive their file
 * controls' error from (imageErrorOf). A file chosen for another card, and a
 * read that lands after the card changed, show nothing.
 */
export function stagedImage({draft, upload}: {draft: Draft; upload: Pick<ImageUpload, 'file' | 'dataUrl' | 'error'>}): ChosenImage {
  if (draft.image === null) return NOTHING_STAGED;
  if (upload.file !== draft.image) return NOTHING_STAGED;
  return {name: draft.image.name, dataUrl: upload.dataUrl, error: upload.error};
}

/** What the edit changes on the card (cardChanges); none for an image-only card. */
export function draftChanges(draft: Draft): PreviewCardChanges {
  const fields = fieldsOf(draft);
  return fields === null ? {} : cardChanges(fields.loaded, fields.before, fields.form);
}

/** New reveal's validator, for the edit (validateCardEdit); nothing to check on an image-only card. */
export function draftValidation({draft, imageName}: {draft: Draft; imageName: string | null}): ValidationResult {
  const fields = fieldsOf(draft);
  return fields === null ? {ok: true, errors: {}} : validateCardEdit(fields.form, imageName);
}

/**
 * The live preview: the form built as New reveal builds it (buildPreview),
 * over the staged image or else the card's current art; for an image-only
 * card, the card itself with the staged image swapped in; null until the card
 * is open.
 */
export function editPreview({card, draft, dataUrl}: {card: LorcanaCard | null; draft: Draft; dataUrl: string | null}): LorcanaCard | null {
  if (card === null) return null;
  const fields = fieldsOf(draft);
  if (fields === null) return dataUrl === null ? card : {...card, imageUrl: dataUrl};
  return buildPreview(fields.form, dataUrl ?? card.imageUrl ?? null);
}

/**
 * The preview's synergies against every other card. The list's own copy of
 * the card goes: its old values would be scored against the edit. None for
 * an image-only card, whose page shows no synergy panel (R-61, R-90).
 */
export function editSynergies({preview, draft, cards}: {preview: LorcanaCard | null; draft: Draft; cards: readonly LorcanaCard[]}): SynergyGroup[] {
  if (preview === null || fieldsOf(draft) === null) return [];
  return computeSynergies(preview, cards.filter((other) => other.id !== preview.id));
}

/**
 * previewCards.json as Edit card's search reads it, whatever card is open
 * (R-71): its ids once read, and its own error. A failed reload keeps the last
 * read's ids beside its error (R4-4a's reloadError).
 */
export interface PreviewFileView {
  status: PreviewCardsFile['status'];
  /** The file's ids (R4-4a's `ids`, which R4-2b's searchCards takes as previewIds); null until a read lands. */
  previewIds: ReadonlySet<number> | null;
  error: string | null;
}

export function previewFileView(file: PreviewCardsFile): PreviewFileView {
  if (file.status === 'ready') return {status: 'ready', previewIds: file.ids, error: file.reloadError ?? null};
  if (file.status === 'error') return {status: 'error', previewIds: null, error: file.error};
  return {status: 'loading', previewIds: null, error: null};
}
