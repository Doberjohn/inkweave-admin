import {useState} from 'react';
import type {LorcanaCard, LorcanaJSONCard, SynergyGroup} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload, type ImageUpload} from '../../components/useImageUpload';
import type {CommitResult} from '../../github/githubCommit';
import {commitCardImage} from '../image/githubClient';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {commitCardEdit, StaleCardError, type StagedImage} from '../reveal/githubClient';
import {buildPreview, computeSynergies} from '../reveal/livePreview';
import {mergeCardChanges, type PreviewCardChanges} from '../reveal/replaceCardInPreviewJson';
import type {ValidationResult} from '../reveal/validateForm';
import {
  canSaveEdit,
  cardChanges,
  cardTag,
  changeRows,
  editKindOf,
  formFromPreviewCard,
  validateCardEdit,
  withBranchPreviews,
  type CardTag,
  type ChangeRow,
  type EditKind,
  type SaveGate,
  type StagedImageState,
} from './cardEdit';
import type {PreviewCardsFile, UsePreviewCardsFile} from './usePreviewCardsFile';

export type CardLookup = 'none' | 'loading' | 'ready' | 'missing' | 'error';

export interface CardEditorController {
  /** Every card Edit card opens: the live list, then the branch's preview cards not live yet. */
  cards: LorcanaCard[];
  /** The ids previewCards.json holds on the branch; none until it is read. */
  previewIds: ReadonlySet<number>;
  lookup: CardLookup;
  lookupError: string | null;
  /** Reads again whatever failed: previewCards.json (its first read or its newest), the card list, or both. */
  retry: () => void;
  card: LorcanaCard | null;
  tag: CardTag | null;
  kind: EditKind | null;
  /** The form; null for an image-only card. */
  form: RevealCardForm | null;
  patchForm: (patch: Partial<RevealCardForm>) => void;
  validation: ValidationResult;
  changes: ChangeRow[];
  /** A field change previewCards.json would take, or a staged image. */
  dirty: boolean;
  discard: () => void;
  previewCard: LorcanaCard | null;
  synergyGroups: SynergyGroup[];
  imageName: string | null;
  imageDataUrl: string | null;
  /** The upload's error, else the validator's image error; shown beside the upload. */
  imageError: string | null;
  onImageChange: (file: File | null) => void;
  revertImage: () => void;
  canSave: boolean;
  saving: boolean;
  result: CommitResult | null;
  /** Why this draft's last save failed: the commit's failure only. */
  saveError: string | null;
  save: () => void;
  /** This draft's last save was refused because the card changed on the branch since it loaded. */
  stale: boolean;
  /** Load it again was asked for, and its read is still on its way. */
  loadingAgain: boolean;
  /** The newest read of previewCards.json failed; the editor keeps the last one, and retry reads again. */
  reloadError: string | null;
  /** Drops this card's edits and loads it from previewCards.json as it is now. */
  loadAgain: () => void;
}

/** The form as loaded and as edited. */
interface DraftFields {
  before: RevealCardForm;
  form: RevealCardForm;
}

/** One card's edit: its entry and form as loaded, and the form now. */
interface Draft {
  cardId: string | null;
  /** Bumped on every seed, so a save that lands late can tell its draft is gone. */
  seed: number;
  /** The read of previewCards.json it was seeded from; null before one is ready. */
  read: number | null;
  /** Re-seed from a newer read: true before the first read, and after Load it again. */
  follow: boolean;
  /** The card's previewCards.json entry; null for a released card. */
  loaded: LorcanaJSONCard | null;
  /** Null for an image-only card. */
  fields: DraftFields | null;
}

/** A fields save, as it should leave its draft: the entry committed and the form it was made from. */
interface SavedDraft {
  seed: number;
  loaded: LorcanaJSONCard;
  form: RevealCardForm;
}

/** What a save commits, settled when Save renders on. */
interface SavePlan {
  /** The draft it saves. */
  seed: number;
  token: string;
  card: LorcanaCard;
  /** previewCards.json's part, when the form changes the card. */
  edit: {loaded: LorcanaJSONCard; changes: PreviewCardChanges; saved: SavedDraft} | null;
  image: StagedImage | null;
}

/** The last save's outcome, for the draft that made it: its commit, or why it failed and whether the card was stale. */
interface Outcome {
  seed: number;
  result: CommitResult | null;
  error: string | null;
  stale: boolean;
}

type CardList = ReturnType<typeof useCardDataContext>;

const NO_OUTCOME: Outcome = {seed: -1, result: null, error: null, stale: false};
const NO_IDS: ReadonlySet<number> = new Set();
const VALID: ValidationResult = {ok: true, errors: {}};
const NOT_OPEN = {card: null, tag: null, kind: null};

function seedDraft({cardId, file, seed}: {cardId: string | null; file: PreviewCardsFile; seed: number}): Draft {
  if (file.status !== 'ready') return {cardId, seed, read: null, follow: true, loaded: null, fields: null};
  const loaded = file.cards.find((c) => String(c.id) === cardId) ?? null;
  const form = loaded && editKindOf(loaded) === 'fields' ? formFromPreviewCard(loaded) : null;
  return {cardId, seed, read: file.read, follow: false, loaded, fields: form && {before: form, form}};
}

/** Whether the draft waits on a read of the file, and a newer one than it was seeded from has landed. */
function newerRead(draft: Draft, file: PreviewCardsFile): boolean {
  if (!draft.follow || file.status !== 'ready') return false;
  return draft.read === null || file.read > draft.read;
}

/** The draft with a form patch applied. The collector number gives the card its id, so it never changes. */
function patched(draft: Draft, patch: Partial<RevealCardForm>): Draft {
  if (!draft.fields) return draft;
  const {form} = draft.fields;
  return {...draft, fields: {...draft.fields, form: {...form, ...patch, collectorNumber: form.collectorNumber}}};
}

function discarded(draft: Draft): Draft {
  return draft.fields ? {...draft, fields: {...draft.fields, form: draft.fields.before}} : draft;
}

/** After a fields save, the draft it was made from (if still on screen) starts from what was committed. */
function withSaved(draft: Draft, saved: SavedDraft): Draft {
  if (draft.seed !== saved.seed || !draft.fields) return draft;
  return {...draft, loaded: saved.loaded, fields: {...draft.fields, before: saved.form}};
}

/** The file's parts the editor reads: its cards and ids once read, and the last reload's error. */
function fileParts(file: PreviewCardsFile) {
  if (file.status !== 'ready') return {entries: [], ids: NO_IDS, reloadError: null};
  return {entries: file.cards, ids: file.ids, reloadError: file.reloadError ?? null};
}

/** Where opening the card stands, from the card id, the file's read and the card list's load. */
function lookupOf(o: {cardId: string | null; file: PreviewCardsFile; cardList: CardList; card: LorcanaCard | null}): CardLookup {
  if (o.cardId === null) return 'none';
  if (o.file.status === 'error' || o.cardList.error) return 'error';
  if (o.file.status === 'loading' || o.cardList.isLoading) return 'loading';
  return o.card ? 'ready' : 'missing';
}

function lookupErrorOf(file: PreviewCardsFile, cardList: CardList): string | null {
  if (file.status === 'error') return file.error;
  return cardList.error ? cardList.error.message : null;
}

/** The open card, its tag and its kind; nulls until the lookup is ready. */
function openedCard(o: {lookup: CardLookup; card: LorcanaCard | null; draft: Draft; ids: ReadonlySet<number>}) {
  if (o.lookup !== 'ready' || !o.card) return NOT_OPEN;
  const kind: EditKind = o.draft.fields ? 'fields' : 'image';
  return {card: o.card, tag: cardTag(o.card, o.ids), kind};
}

/** The draft's field changes and checks; none for an image-only card. */
function checkDraft(draft: Draft, knownIds: ReadonlySet<number>, imageName: string | null) {
  const {loaded, fields} = draft;
  if (!loaded || !fields) return {fieldChanges: {} as PreviewCardChanges, validation: VALID};
  return {
    fieldChanges: cardChanges(loaded, fields.before, fields.form),
    validation: validateCardEdit(fields.form, knownIds, loaded.id, imageName),
  };
}

/** Everything the editor shows that comes from the file, the card list and the draft. */
function viewOf(o: {cardId: string | null; file: PreviewCardsFile; cardList: CardList; draft: Draft; upload: ImageUpload}) {
  const fromFile = fileParts(o.file);
  const cards = withBranchPreviews(o.cardList.cards, fromFile.entries);
  const card = cards.find((c) => c.id === o.cardId) ?? null;
  const lookup = lookupOf({cardId: o.cardId, file: o.file, cardList: o.cardList, card});
  const imageName = o.upload.file ? o.upload.file.name : null;
  const checked = checkDraft(o.draft, new Set(cards.map((c) => Number(c.id))), imageName);
  return {cards, fromFile, lookup, opened: openedCard({lookup, card, draft: o.draft, ids: fromFile.ids}), imageName, ...checked};
}

function imageStateOf(upload: ImageUpload): StagedImageState {
  if (!upload.file) return 'none';
  return upload.dataUrl ? 'ready' : 'pending';
}

/** The staged image to commit: its bytes and its file's extension, once read. */
function stagedImageOf(upload: ImageUpload): StagedImage | null {
  if (!upload.file || !upload.dataUrl) return null;
  return {base64: upload.dataUrl, ext: (upload.file.name.split('.').pop() ?? 'png').toLowerCase()};
}

/** previewCards.json's part of a save: the changes, when the form makes any. */
function editPartOf(draft: Draft, changes: PreviewCardChanges): SavePlan['edit'] {
  const {loaded, fields} = draft;
  if (!loaded || !fields) return null;
  if (Object.keys(changes).length === 0) return null;
  return {loaded, changes, saved: {seed: draft.seed, loaded: mergeCardChanges(loaded, changes), form: fields.form}};
}

/** The save Save would make, or null while it is off. */
function savePlanOf(o: {draft: Draft; token: string; card: LorcanaCard | null; gate: SaveGate; changes: PreviewCardChanges; upload: ImageUpload}): SavePlan | null {
  if (!o.card || !canSaveEdit(o.gate)) return null;
  const edit = editPartOf(o.draft, o.changes);
  return {seed: o.draft.seed, token: o.token, card: o.card, edit, image: stagedImageOf(o.upload)};
}

/**
 * The commit a save makes: field changes go to previewCards.json in one commit
 * with any staged image (commitCardEdit); an image alone goes through the image
 * tool's commit, which leaves the card's data as it is.
 */
function commitPlan({token, card, edit, image}: SavePlan): Promise<CommitResult> {
  if (edit) return commitCardEdit({token, loaded: edit.loaded, changes: edit.changes, image});
  if (!image) return Promise.reject(new Error('Nothing to save'));
  return commitCardImage({token, card, imageBase64: image.base64, imageExt: image.ext});
}

function failure(seed: number, e: unknown): Outcome {
  return {seed, result: null, error: e instanceof Error ? e.message : 'Save failed', stale: e instanceof StaleCardError};
}

/** The card as a save would leave it: the form's card, or the card itself, with the staged image. */
function previewOf(o: {card: LorcanaCard | null; fields: DraftFields | null; imageDataUrl: string | null}): LorcanaCard | null {
  if (!o.card) return null;
  const imageUrl = o.imageDataUrl ?? o.card.imageUrl;
  if (o.fields) return buildPreview(o.fields.form, imageUrl ?? null);
  return {...o.card, imageUrl};
}

/** Whether Load it again's read is on its way: asked for, and neither landed nor failed. */
function loadingAgainOf(draft: Draft, reloadError: string | null): boolean {
  const asked = draft.follow && draft.read !== null;
  return asked && reloadError === null;
}

/** What the editor reports about the draft, the image beside it, and its last save. */
function draftStatus(o: {draft: Draft; upload: ImageUpload; gate: SaveGate; validation: ValidationResult; outcome: Outcome; reloadError: string | null}) {
  // A save that lands after its draft is gone (another card, or Load it again) reports nothing.
  const shown = o.outcome.seed === o.draft.seed ? o.outcome : NO_OUTCOME;
  return {
    dirty: o.gate.fieldChanges || o.upload.file !== null,
    imageError: o.upload.error ?? o.validation.errors.image ?? null,
    loadingAgain: loadingAgainOf(o.draft, o.reloadError),
    result: shown.result,
    saveError: shown.error,
    stale: shown.stale,
  };
}

export interface CardEditorOptions {
  token: string;
  /** The card the URL names; null for none. */
  cardId: string | null;
  /** previewCards.json from the target branch (usePreviewCardsFile), shared with New reveal. */
  file: UsePreviewCardsFile;
}

/**
 * Owns Edit card's state: the card the URL names, its draft and staged image,
 * and the save. A preview card the form holds edits its fields and image in one
 * commit; any other card replaces its image only (editKindOf). The draft
 * re-seeds during render, never in an effect, so no frame pairs one card's form
 * or image with another: when the card changes, when the first read lands, and
 * when a read Load it again asked for lands.
 */
export function useCardEditor({token, cardId, file}: CardEditorOptions): CardEditorController {
  const cardList = useCardDataContext();
  const upload = useImageUpload();
  const [draft, setDraft] = useState<Draft>(() => seedDraft({cardId, file, seed: 0}));
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(NO_OUTCOME);

  const newCard = draft.cardId !== cardId;
  if (newCard || newerRead(draft, file)) {
    setDraft(seedDraft({cardId, file, seed: draft.seed + 1}));
    if (newCard) void upload.choose(null);
  }

  const view = viewOf({cardId, file, cardList, draft, upload});
  const {card, tag, kind} = view.opened;
  const gate = {
    saving,
    fieldChanges: Object.keys(view.fieldChanges).length > 0,
    valid: view.validation.ok,
    image: imageStateOf(upload),
  };
  const plan = savePlanOf({draft, token, card, gate, changes: view.fieldChanges, upload});
  const previewCard = previewOf({card, fields: draft.fields, imageDataUrl: upload.dataUrl});

  function afterSave(done: SavePlan, heldFile: File | null) {
    if (heldFile) upload.clearIf(heldFile);
    if (!done.edit) return;
    const {saved} = done.edit;
    setDraft((d) => withSaved(d, saved));
    // Leaving the card and coming back seeds from the committed entry; this draft doesn't follow.
    file.reload();
  }

  async function save() {
    if (!plan) return;
    const heldFile = upload.file;
    setSaving(true);
    setOutcome(NO_OUTCOME);
    try {
      const result = await commitPlan(plan);
      setOutcome({seed: plan.seed, result, error: null, stale: false});
      afterSave(plan, heldFile);
    } catch (e) {
      setOutcome(failure(plan.seed, e));
    } finally {
      setSaving(false);
    }
  }

  function retry() {
    if (file.status === 'error' || view.fromFile.reloadError) file.reload();
    if (cardList.error) cardList.retryLoad();
  }

  function loadAgain() {
    const asked = file.requested;
    setDraft((d) => ({...d, follow: true, read: asked}));
    file.reload();
  }

  return {
    cards: view.cards,
    previewIds: view.fromFile.ids,
    lookup: view.lookup,
    lookupError: lookupErrorOf(file, cardList),
    retry,
    card,
    tag,
    kind,
    form: draft.fields && draft.fields.form,
    patchForm: (patch) => setDraft((d) => patched(d, patch)),
    validation: view.validation,
    changes: changeRows(draft.loaded, view.fieldChanges, view.imageName),
    ...draftStatus({draft, upload, gate, validation: view.validation, outcome, reloadError: view.fromFile.reloadError}),
    discard: () => {
      setDraft(discarded);
      void upload.choose(null);
    },
    previewCard,
    synergyGroups: computeSynergies(previewCard, view.cards.filter((c) => c.id !== cardId)),
    imageName: view.imageName,
    imageDataUrl: upload.dataUrl,
    onImageChange: upload.choose,
    revertImage: () => void upload.choose(null),
    canSave: plan !== null,
    saving,
    save: () => void save(),
    reloadError: view.fromFile.reloadError,
    loadAgain,
  };
}
