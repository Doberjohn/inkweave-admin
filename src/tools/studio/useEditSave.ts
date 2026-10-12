import {useState, type Dispatch, type SetStateAction} from 'react';
import type {CommitResult} from '../../github/githubCommit';
import {commitCardImage} from '../image/githubClient';
import {commitCardEdit} from '../reveal/githubClient';
import {mergeCardChanges} from '../reveal/replaceCardInPreviewJson';
import type {Draft} from './editorState';
import {
  failureOf,
  imageSent,
  savePlanOf,
  savedDraft,
  type EditResult,
  type SaveFailure,
  type SaveInput,
  type SavePlan,
} from './editSave';
import type {UsePreviewCardsFileResult} from './usePreviewCardsFile';

/** What the outcome shows: the last save's commit, or its failure and its kind. */
interface OutcomeFields {
  result: EditResult | null;
  saveError: string | null;
  failure: SaveFailure | null;
}

/** The last save's outcome, tied to the draft it was made from (R-69). */
interface Outcome extends OutcomeFields {
  seed: number;
}

const NO_OUTCOME: OutcomeFields = {result: null, saveError: null, failure: null};

/** What the save side takes from the editor: a save's inputs, and the handles a landed save moves. */
export interface EditSaveInput extends SaveInput {
  setDraft: Dispatch<SetStateAction<Draft>>;
  /** useImageUpload's clearIf: drops the upload if it still holds the file a save sent. */
  clearIf: (file: File) => boolean;
  file: Pick<UsePreviewCardsFileResult, 'requested' | 'reload' | 'commit'>;
}

/** Edit card's save side, as the controller spreads it. */
export interface EditSave extends OutcomeFields {
  /** Nothing is saving, and savePlanOf has a commit to make. */
  canSave: boolean;
  saving: boolean;
  /** Settles once the commit lands or fails; the outcome says which. */
  save: () => Promise<void>;
  /** After a 'stale' failure: read the file again. Resolves true once that read lands and re-seeds the draft (R-68). */
  loadAgain: () => Promise<boolean>;
  /**
   * How many edits the last Load it again dropped (R-68), or the read that left
   * the card out of the file (gone or missing, R-66); null until one lands on
   * this card, and again once a save starts.
   */
  dropped: number | null;
}

/** The commit the plan makes. */
function commitOf(plan: SavePlan): Promise<CommitResult> {
  return plan.path === 'fields' ? commitCardEdit(plan.commit) : commitCardImage(plan.commit);
}

/**
 * What a landed save does besides its outcome. A fields save puts the entry it
 * committed in the file at once, which also reads the file again (R4-4a's
 * commit), and makes it the baseline of the draft it was made from (R-70). The
 * file it sent leaves the upload and the draft, unless another was chosen
 * since (clearIf, imageSent).
 */
function land(plan: SavePlan, {setDraft, clearIf, file}: Pick<EditSaveInput, 'setDraft' | 'clearIf' | 'file'>): void {
  const {sent} = plan;
  if (plan.path === 'fields') {
    const entry = mergeCardChanges(plan.commit.loaded, plan.commit.changes);
    file.commit(entry);
    setDraft((draft) => savedDraft(draft, {seed: plan.seed, loaded: entry, form: plan.form}));
  }
  if (sent) {
    clearIf(sent);
    setDraft((draft) => imageSent(draft, sent));
  }
}

/** The outcome the draft on screen shows: its own save's, never one made from an earlier draft (R-69). */
function outcomeFor({outcome, draft}: {outcome: Outcome | null; draft: Draft}): OutcomeFields {
  if (outcome?.seed !== draft.seed) return NO_OUTCOME;
  const {result, saveError, failure} = outcome;
  return {result, saveError, failure};
}

/** The draft without its "Load it again" count, once a save starts. */
function withoutDropped(draft: Draft): Draft {
  return {...draft, dropped: undefined};
}

/**
 * Edit card's save side (R4-4c). Save runs the commit savePlanOf picks. Its
 * outcome belongs to the draft it was made from: a new card, a read the draft
 * follows, or one that leaves the card out of the file (gone or missing,
 * R-66), re-seeds the draft, and the outcome then shows nothing, so a save
 * that lands after the operator left the card shows nothing (R-69). A landed
 * save keeps the card open on its new baseline (R-70). `saving` spans cards,
 * so no save starts while one runs.
 */
export function useEditSave(input: EditSaveInput): EditSave {
  const {draft, setDraft, file} = input;
  const [saving, setSaving] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const plan = saving ? null : savePlanOf(input);

  async function save(): Promise<void> {
    if (!plan) return;
    setSaving(true);
    setOutcome(null);
    setDraft(withoutDropped);
    try {
      const {commitUrl} = await commitOf(plan);
      setOutcome({...NO_OUTCOME, seed: plan.seed, result: {commitUrl, withImage: plan.sent !== null}});
      land(plan, input);
    } catch (e) {
      const {failure, message} = failureOf(e);
      setOutcome({...NO_OUTCOME, seed: plan.seed, saveError: message, failure});
    } finally {
      setSaving(false);
    }
  }

  // The draft follows the next read to land (R4-4b's needsSeed), keeping what still applies (keepEdits).
  function loadAgain(): Promise<boolean> {
    setDraft((current) => ({...current, follow: true, read: file.requested}));
    return file.reload().then((cards) => cards !== null);
  }

  return {canSave: plan !== null, saving, save, loadAgain, dropped: draft.dropped ?? null, ...outcomeFor({outcome, draft})};
}
