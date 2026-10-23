import {useLayoutEffect, useRef, useState} from 'react';
import {useImageUpload, type ImageUpload} from '../../../components/useImageUpload';
import {targetBranch, type CommitResult} from '../../../github/githubCommit';
import {forgetBranchFiles, messageOf} from '../finishes/branchFiles';
import {
  EMPTY_PRINTING_FORM,
  changeOf,
  editValuesOf,
  outcomeNote,
  sameValues,
  type PrintingFormValues,
  type ScanState,
} from './printingForm';
import type {BaseCard, CatalogPrinting} from './promoCatalog';
import {PrintingRefusal, factsOf, publishPrinting} from './publishPrinting';

/*
 * The promo printing form's controller (#77): the one form open in Edit card's Printings panel (an add
 * of a printing, or an edit of one), the scan it holds, whether its publish runs, and the line a closed
 * form leaves. StudioWorkspace holds it above the panes, so a mode switch keeps the form and the
 * unsaved-changes guard reads its `dirty` and `publishing`. The rules are printingForm.ts's and the
 * commit is publishPrinting.ts's: this keeps what the owner entered and what the publish came to.
 *
 * The form belongs to the card the URL names. The render that sees another card drops the form, its
 * outcome and its publish (as useEditDraft re-seeds Edit card's draft), so no frame pairs one card's
 * form with another card. The scan is the upload's (useImageUpload): opening a form, Cancel, and a
 * publish that closes or re-seeds the form empty it. A card change leaves it to the next open, which
 * empties it too, since a form that is gone shows no scan.
 *
 * A publish is told from the form it was made for by a count (`epoch`) of the times a form opened, was
 * cancelled or lost its card. One that settles after the count moved changes nothing here: not the
 * form the owner opened since, and not an outcome for a form that is gone. The branch's files still
 * read again after a commit that landed and after any refusal of the branch's, whoever is looking, so
 * the panel shows the branch the publish saw (after a `changed` refusal, the values the re-seeded form
 * shows). A failure that read nothing new, a lost race or a network error, leaves them be.
 */

/** The printing form that is open: an add of a printing of `card`, or an edit of one. */
export interface OpenPrintingForm {
  kind: 'add' | 'edit';
  card: BaseCard;
  /** The printing an edit opened, as the branch held it then; null for an add. */
  printing: CatalogPrinting | null;
  values: PrintingFormValues;
  /** What the form opened with: an add's values are empty, an edit's are its printing's. */
  initial: PrintingFormValues;
  scan: ScanState;
  /** The last publish's failure while the form stays open, or null. */
  error: string | null;
}

/** What the line under the rows shows once no form is open: the last landed commit, or a refusal that closed the form ('gone'). */
export interface PrintingOutcome {
  result: CommitResult | null;
  error: string | null;
  /** When the printing shows, once a publish landed; blank otherwise. */
  note: string;
}

export interface PrintingFormController {
  form: OpenPrintingForm | null;
  /** Anything entered or chosen that the open form doesn't start with: what the guard counts. */
  dirty: boolean;
  publishing: boolean;
  outcome: PrintingOutcome;
  openAdd: (card: BaseCard) => void;
  openEdit: (opts: {card: BaseCard; printing: CatalogPrinting}) => void;
  patch: (patch: Partial<PrintingFormValues>) => void;
  chooseScan: (file: File | null) => Promise<void>;
  cancel: () => void;
  /** Publishes the open form; resolves true when it landed. */
  publish: () => Promise<boolean>;
}

/** What the controller needs from its page. */
export interface PrintingFormInput {
  /** The saved GitHub token: the studio renders the form only under the token gate. */
  token: string;
  /** The URL's card id (?card=), or null for the search. */
  cardId: string | null;
}

/** The open form without its scan, which the upload holds. */
type FormState = Omit<OpenPrintingForm, 'scan'>;

/** What a form opens with: everything but the failure it hasn't had. */
type NewForm = Omit<FormState, 'error'>;

/** Everything the controller keeps but the scan: the open form, the line a closed one leaves, and whether its publish runs. */
interface Held {
  form: FormState | null;
  outcome: PrintingOutcome;
  publishing: boolean;
}

const NO_OUTCOME: PrintingOutcome = {result: null, error: null, note: ''};

/** No form, no outcome and no publish: where the controller starts, and where another card puts it. */
const NOTHING_HELD: Held = {form: null, outcome: NO_OUTCOME, publishing: false};

/** A publish that landed: its commit, and whether a scan went with it. */
interface Landed {
  kind: 'landed';
  commitUrl: string;
  scanSent: boolean;
}

/**
 * A publish that did not land. The branch refused it (a PrintingRefusal) after reading itself: a printing
 * it changed since the form opened comes with the branch's (`changed`), one it no longer has closes the
 * form (`gone`), and any other refusal leaves the form as it is (`refused`: files out of step, a taken
 * code, an unknown promo set). Anything else read nothing new of the branch and leaves the form as it
 * is too (`failed`: a branch that moved meanwhile, a rejected token, a file that can't be read).
 */
type Failure =
  | {kind: 'changed'; now: CatalogPrinting; message: string}
  | {kind: 'gone'; message: string}
  | {kind: 'refused'; message: string}
  | {kind: 'failed'; message: string};

/** What a publish came to. */
type Settled = Landed | Failure;

/** What a failed publish says, and what it does to the form. */
function failureOf(error: unknown): Failure {
  const message = messageOf(error);
  if (!(error instanceof PrintingRefusal)) return {kind: 'failed', message};
  if (error.kind === 'gone') return {kind: 'gone', message};
  if (error.kind === 'changed' && error.now !== null) return {kind: 'changed', now: error.now, message};
  return {kind: 'refused', message};
}

/**
 * Whether the publish saw the branch as it is now: it landed, or the branch refused it, whatever the
 * refusal. The files kept of the branch may differ from what it saw (a refusal can come of a change they
 * lack), so they are read again. A failure that read nothing new, a lost race or a network error, says
 * nothing of them.
 */
function sawTheBranch({kind}: Settled): boolean {
  return kind !== 'failed';
}

/** Whether the publish closed the form or re-seeded it, so the scan it held goes: it landed, or the branch found the printing gone or changed. */
function endedTheForm({kind}: Settled): boolean {
  return kind === 'landed' || kind === 'gone' || kind === 'changed';
}

/** What `runPublish` reads. */
interface PublishInput {
  token: string;
  form: FormState;
  scan: ScanState;
}

/**
 * Publishes the form and says what came of it. It never throws: a form that is still missing something
 * (changeOf), a refusal, a branch that moved and a file that can't be read all come back as a failure.
 */
async function runPublish({token, form, scan}: PublishInput): Promise<Settled> {
  try {
    const change = changeOf({kind: form.kind, card: form.card, printing: form.printing, values: form.values, scan});
    const {commitUrl} = await publishPrinting({token, change});
    return {kind: 'landed', commitUrl, scanSent: change.scan !== null};
  } catch (e) {
    return failureOf(e);
  }
}

/** The scan as the form shows it: the chosen file's name, its bytes once they are read and checked, and why they can't be. */
function scanOf({file, dataUrl, error}: ImageUpload): ScanState {
  return {name: file?.name ?? null, dataUrl, error};
}

/** Whether the open form is an edit of a printing with Ravensburger's art: an edit doesn't replace that art, so the form holds no scan. */
function keepsItsArt(form: FormState | null): boolean {
  const printing = form?.printing ?? null;
  return printing !== null && factsOf(printing).officialArt;
}

/** Whether the owner entered or chose anything the form didn't open with: a file, or values that would publish something else. */
function isDirty({form, upload}: {form: FormState | null; upload: ImageUpload}): boolean {
  if (form === null) return false;
  return upload.file !== null || !sameValues(form.values, form.initial);
}

/** A form that just opened: no outcome stands beside it, and no publish of its own runs. */
function opened(form: NewForm): Held {
  return {form: {...form, error: null}, outcome: NO_OUTCOME, publishing: false};
}

/** The form cancelled. The outcome stays as opening the form left it: blank. */
function closed(held: Held): Held {
  return {...held, form: null, publishing: false};
}

/** The form with `patch` entered. */
function patched(held: Held, patch: Partial<PrintingFormValues>): Held {
  const {form} = held;
  if (form === null) return held;
  return {...held, form: {...form, values: {...form.values, ...patch}}};
}

/** The form as its publish starts: what the last one said is gone from it. */
function publishStarted(held: Held): Held {
  const {form} = held;
  if (form === null) return held;
  return {...held, form: {...form, error: null}, publishing: true};
}

/**
 * The edit form once the branch's printing changed: its values and its baseline are the branch's, and the
 * owner makes the change again. The note the owner typed stays: a note is only ever appended, so it can't
 * clash with the branch's, and the baseline's is blank, so the form still counts it as unsaved.
 */
function reseeded({form, now, message}: {form: FormState; now: CatalogPrinting; message: string}): FormState {
  const initial = editValuesOf(now);
  return {...form, printing: now, values: {...initial, note: form.values.note}, initial, error: message};
}

/** The held state once the publish `settled`: a landed one or a printing found gone closes the form, and the line under the rows says which. */
function settledHeld(held: Held, settled: Settled): Held {
  const {form} = held;
  if (settled.kind === 'landed') {
    const note = outcomeNote({scanSent: settled.scanSent, branch: targetBranch()});
    return {form: null, publishing: false, outcome: {result: {commitUrl: settled.commitUrl}, error: null, note}};
  }
  if (settled.kind === 'gone') return {form: null, publishing: false, outcome: {...NO_OUTCOME, error: settled.message}};
  if (form === null) return {...held, publishing: false};
  const next = settled.kind === 'changed' ? reseeded({form, now: settled.now, message: settled.message}) : {...form, error: settled.message};
  return {...held, form: next, publishing: false};
}

/**
 * Card studio's promo printing form (#77). A form opens for a card (`openAdd`) or for one of its promo
 * printings (`openEdit`), the owner fills it in (`patch`, `chooseScan`), and `publish` commits it.
 * Nothing here decides whether Publish is on: the form reads that from printingForm.ts's rules.
 */
export function usePrintingForm({token, cardId}: PrintingFormInput): PrintingFormController {
  const [held, setHeld] = useState(NOTHING_HELD);
  const [seenCard, setSeenCard] = useState(cardId);
  const upload = useImageUpload();
  const scan = scanOf(upload);
  const epoch = useRef(0);

  // Another card: the form, its outcome and its publish are gone before anything paints.
  if (cardId !== seenCard) {
    setSeenCard(cardId);
    setHeld(NOTHING_HELD);
  }
  // The count can't move during render. It moves as the card does, in the commit that shows the next one
  // (a layout effect, so no publish settles between the two), and when the page goes.
  useLayoutEffect(
    () => () => {
      epoch.current += 1;
    },
    [cardId],
  );

  function open(form: NewForm) {
    epoch.current += 1;
    void upload.choose(null);
    setHeld(opened(form));
  }

  function openEdit({card, printing}: {card: BaseCard; printing: CatalogPrinting}) {
    const values = editValuesOf(printing);
    open({kind: 'edit', card, printing, values, initial: values});
  }

  function cancel() {
    epoch.current += 1;
    void upload.choose(null);
    setHeld(closed);
  }

  async function chooseScan(file: File | null): Promise<void> {
    if (file !== null && keepsItsArt(held.form)) return;
    await upload.choose(file);
  }

  /** Applies what a publish came to to the form it was made for, while that form is open. */
  function apply(settled: Settled) {
    if (endedTheForm(settled)) void upload.choose(null);
    setHeld((current) => settledHeld(current, settled));
  }

  /** Applies what a publish came to, unless the form it was made for is gone. True when it landed, whether or not that form is still open. */
  function settle({settled, started}: {settled: Settled; started: number}): boolean {
    if (sawTheBranch(settled)) forgetBranchFiles();
    if (epoch.current === started) apply(settled);
    return settled.kind === 'landed';
  }

  async function publish(): Promise<boolean> {
    const {form, publishing} = held;
    if (form === null || publishing) return false;
    const started = epoch.current;
    setHeld(publishStarted);
    const settled = await runPublish({token, form, scan});
    return settle({settled, started});
  }

  return {
    form: held.form === null ? null : {...held.form, scan},
    dirty: isDirty({form: held.form, upload}),
    publishing: held.publishing,
    outcome: held.outcome,
    openAdd: (card) => open({kind: 'add', card, printing: null, values: EMPTY_PRINTING_FORM, initial: EMPTY_PRINTING_FORM}),
    openEdit,
    patch: (patch) => setHeld((current) => patched(current, patch)),
    chooseScan,
    cancel,
    publish,
  };
}
