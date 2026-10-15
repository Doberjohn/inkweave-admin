import type {LorcanaCard, LorcanaJSONCard} from 'inkweave-synergy-engine';
import {targetBranch} from '../../github/githubCommit';
import {isRejectedToken} from '../../github/rejectedToken';
import type {CardImageCommit} from '../image/githubClient';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {StaleCardError, type CardEditCommit} from '../reveal/githubClient';
import type {PreviewCardChanges} from '../reveal/replaceCardInPreviewJson';
import type {ValidationResult} from '../reveal/validateForm';
import {isRevealPreview} from './branchCards';
import {hasEdits} from './cardEdit';
import {fieldsOf, seedDraft, type Draft, type FieldsEdit, type SeedInput, type StagedImage} from './editorState';

/*
 * Edit card's save side as pure helpers (R4-4c): the commit a save makes, how
 * a failure reads, and what a landed save or "Load it again" does to the
 * draft. useEditSave wires them; useCardEditor seeds through reseeded.
 */

/** Why a save failed, as the outcome tells the kinds apart (R-26, R-67). */
export type SaveFailure = 'stale' | 'rejected-token' | 'other';

/** A save that landed: its commit, and whether an image went with it (Edit's go-live note, R4-6b). */
export interface EditResult {
  commitUrl: string;
  withImage: boolean;
}

/** What a save reads from the editor. */
export interface SaveInput {
  token: string;
  draft: Draft;
  /** The open card, once the lookup is ready; else null. */
  card: LorcanaCard | null;
  /** draftChanges' result: {} for an image-only card. */
  changes: PreviewCardChanges;
  validation: ValidationResult;
  /** stagedImage's result: the upload, when it holds this draft's file. */
  staged: StagedImage;
}

/**
 * The commit a save makes, and what it was made from: `seed` ties its outcome
 * to the draft (R-69), `form` is the form a fields save commits, the baseline
 * once it lands (R-70), and `sent` is the file it sends, which clears once it
 * lands. An image-only save `checksFile` for a reveal-set card under a preview
 * id: it goes through commitPreviewCardImage, which refuses it once
 * previewCards.json no longer holds the card. Any other card's goes through
 * commitCardImage, which reads nothing (R-71).
 */
export type SavePlan =
  | {path: 'fields'; seed: number; form: RevealCardForm; sent: File | null; commit: CardEditCommit}
  | {path: 'image'; seed: number; sent: File; checksFile: boolean; commit: Omit<CardImageCommit, 'atBase'>};

/** This draft's staged file, with its bytes once read and checked. */
interface Upload {
  file: File;
  dataUrl: string | null;
}

/** The file staged for this draft, or null with none (stagedImage names it only while the upload holds it). */
function uploadOf({draft, staged}: Pick<SaveInput, 'draft' | 'staged'>): Upload | null {
  if (staged.name === null || draft.image === null) return null;
  return {file: draft.image, dataUrl: staged.dataUrl};
}

/** The extension a commit files the image under; useImageUpload's byte check matched it to the bytes. */
function extOf(file: File): string {
  return (file.name.split('.').pop() ?? '').toLowerCase();
}

/** The staged image as commitCardEdit sends it, or null with none. */
function sentImage(upload: Upload | null): CardEditCommit['image'] {
  return upload?.dataUrl ? {dataUrl: upload.dataUrl, ext: extOf(upload.file)} : null;
}

type PlanInput = SaveInput & {card: LorcanaCard; upload: Upload | null};

/** A fields save: the edit through commitCardEdit, with the staged image when there is one, once the form validates. */
function fieldsPlan({token, draft, changes, validation, upload}: PlanInput): SavePlan | null {
  const fields = fieldsOf(draft);
  if (fields === null) return null;
  if (!validation.ok) return null;
  const commit = {token, loaded: fields.loaded, changes, image: sentImage(upload)};
  return {path: 'fields', seed: draft.seed, form: fields.form, sent: upload?.file ?? null, commit};
}

/**
 * An image-only save: the staged image alone, which never edits
 * previewCards.json. It checks the file still holds a reveal-set card under a
 * preview id (isRevealPreview), the one kind the file decides.
 */
function imagePlan({token, draft, card, upload}: PlanInput): SavePlan | null {
  if (!upload?.dataUrl) return null;
  const commit = {token, card: {id: card.id, fullName: card.fullName}, imageBase64: upload.dataUrl, imageExt: extOf(upload.file)};
  return {path: 'image', seed: draft.seed, sent: upload.file, checksFile: isRevealPreview(card), commit};
}

/**
 * The commit Save would make now, or null when it can't. A changed card key
 * (hasEdits, the one edits rule) goes through commitCardEdit; an image alone,
 * on any card, goes through commitCardImage, checking the branch file for a
 * preview card. A staged image whose bytes aren't read yet, or failed their
 * check, holds both back.
 */
export function savePlanOf(input: SaveInput): SavePlan | null {
  const {card} = input;
  const upload = uploadOf(input);
  if (card === null) return null;
  if (upload?.dataUrl === null) return null;
  const plan = {...input, card, upload};
  return hasEdits({changes: input.changes, imageName: null}) ? fieldsPlan(plan) : imagePlan(plan);
}

/**
 * commitFiles' race refusal (githubCommit.ts) speaks of publishing, and Edit
 * saves: say it in Save's words. Every other message reads as it is.
 */
function inSaveWords(error: Error): string {
  const branch = targetBranch();
  const race = `${branch} changed while publishing, so nothing was published. Publish again.`;
  return error.message === race ? `${branch} changed while saving, so nothing was saved. Save again.` : error.message;
}

/**
 * What a failed save asks of the operator:
 * - 'stale': the card's entry changed on the branch, or left the file, since
 *   it was loaded (StaleCardError, R-67). Load it again keeps the edits that
 *   still apply (R-68).
 * - 'rejected-token': GitHub answered 401. Forget token brings the gate back (R-26).
 * - 'other': anything else, the race included. The edits stay, and saving again is the retry.
 */
export function failureOf(error: unknown): {failure: SaveFailure; message: string} {
  if (error instanceof StaleCardError) return {failure: 'stale', message: error.message};
  const message = error instanceof Error ? inSaveWords(error) : 'Save failed';
  return {failure: isRejectedToken(message) ? 'rejected-token' : 'other', message};
}

/** A fields save that landed: the entry it committed, and the form it was made from. */
export interface SavedFields {
  seed: number;
  loaded: LorcanaJSONCard;
  form: RevealCardForm;
}

/**
 * The draft once a fields save lands (R-70). If it is still the draft the save
 * was made from, the committed entry and the saved form become its baseline,
 * so edits typed while the save ran stay as changes. Any other draft (the
 * operator left the card) stays as it is (R-69).
 */
export function savedDraft(draft: Draft, saved: SavedFields): Draft {
  const fields = fieldsOf(draft);
  if (draft.seed !== saved.seed) return draft;
  if (fields === null) return draft;
  return {...draft, edit: {...fields, loaded: saved.loaded, before: saved.form}};
}

/** The draft once the save that sent `sent` lands: the file leaves it, unless another was chosen since. */
export function imageSent(draft: Draft, sent: File): Draft {
  return draft.image === sent ? {...draft, image: null} : draft;
}

/** The form fields the edit has changed. */
function editedFields({before, form}: FieldsEdit): (keyof RevealCardForm)[] {
  return (Object.keys(form) as (keyof RevealCardForm)[]).filter((field) => form[field] !== before[field]);
}

/** `form` with `fields` taken from `edits`. */
function withFields(form: RevealCardForm, edits: RevealCardForm, fields: (keyof RevealCardForm)[]): RevealCardForm {
  return fields.reduce<RevealCardForm>((next, field) => ({...next, [field]: edits[field]}), form);
}

/**
 * A same-card re-seed (its first read, "Load it again" (R-68), or a read that
 * left the card out of the file, R-66): `fresh` is the draft seeded from the
 * read that landed. It keeps the staged image, which reseeded then drops for a
 * card left with nothing to edit. Each field the old draft changed is kept
 * while the fresh form still holds the value that edit started from; the rest
 * take the fresh values, and `dropped` counts them. A card that no longer
 * opens with fields drops every edit. A draft before its first read has
 * nothing to count. An image-only draft has no field edit to drop, so a read
 * it asked for (the image-only view's re-read of an entry the form can't
 * hold, R-65) counts none, and the outcome says the read landed.
 */
export function keepEdits(draft: Draft, fresh: Draft): Draft {
  const was = fieldsOf(draft);
  const kept = {...fresh, image: draft.image};
  if (draft.edit === null) return kept;
  if (was === null) return {...kept, dropped: 0};
  const now = fieldsOf(fresh);
  const edited = editedFields(was);
  const stay = edited.filter((field) => now?.before[field] === was.before[field]);
  const edit = now === null ? fresh.edit : {...now, form: withFields(now.form, was.form, stay)};
  return {...kept, edit, dropped: edited.length - stay.length};
}

/**
 * The draft a seed during render gives (R4-4b's needsSeed): another card starts
 * afresh, and the same card's newer read keeps what still applies (keepEdits).
 * A read that leaves the card out of the file (gone or missing, R-66) seeds it
 * with nothing to edit, and the staged image goes too: neither state has a
 * file control or a save, so a kept image would leave the draft dirty, and
 * the unsaved-changes guard asking, with nothing on screen to discard.
 */
export function reseeded({draft, ...input}: Omit<SeedInput, 'seed'> & {draft: Draft}): Draft {
  const fresh = seedDraft({...input, seed: draft.seed + 1});
  if (draft.cardId !== input.cardId) return fresh;
  const kept = keepEdits(draft, fresh);
  return fresh.edit === null ? {...kept, image: null} : kept;
}
