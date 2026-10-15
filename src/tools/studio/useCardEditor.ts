import {useState, type Dispatch, type SetStateAction} from 'react';
import type {LorcanaCard, SynergyGroup} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload} from '../../components/useImageUpload';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {imageErrorOf} from '../reveal/livePreview';
import type {ValidationResult} from '../reveal/validateForm';
import {branchLookup, deployedOf, editSources} from './branchCards';
import {hasEdits, type ImageOnlyReason} from './cardEdit';
import {changeRows, type ChangeRow} from './changeRows';
import type {CardTag} from './editSearch';
import {reseeded} from './editSave';
import {
  discardDraft,
  draftChanges,
  draftValidation,
  draftView,
  editLookup,
  editPreview,
  editSynergies,
  imageOnlyOf,
  needsSeed,
  openCard,
  openTag,
  patchDraft,
  previewFileView,
  seedDraft,
  stageImage,
  stagedImage,
  type Draft,
  type EditLookup,
  type PreviewFileView,
} from './editorState';
import type {PreviewCardsFile} from './previewCardsFile';
import {usePreviewCardsFile, type UsePreviewCardsFileResult} from './usePreviewCardsFile';
import {useEditSave, type EditSave} from './useEditSave';

export interface CardEditorInput {
  /** The saved GitHub token: the studio renders the editor only under the token gate. */
  token: string;
  /** The URL's card id (?card=), or null for the search. */
  cardId: string | null;
}

export interface CardEditorController extends EditSave {
  /** The open card, in cardPageState's order (editorState.ts). */
  lookup: EditLookup;
  /**
   * Reads again what failed: the card list (its retryLoad), and
   * previewCards.json whenever the search shows a file error (a failed first
   * read, or a later read's reloadError). Resolves as retryReads says.
   */
  retry: () => Promise<boolean>;
  /**
   * previewCards.json as read, whatever card is open (R-71): the search's tags
   * and file error, and the open card's failed re-read; `reload` reads it again.
   */
  previewFile: PreviewFileView & {reload: () => void};
  /** The open card's tag, as the search tags it (cardTag); null until it is ready. */
  tag: CardTag | null;
  /** The form now; null for an image-only card, for a gone one (R-66), and until the card is ready. */
  form: RevealCardForm | null;
  /**
   * Why the open card is image-only (R-61, R-65), or null: what the page
   * shows beside a null `form`. It follows the lookup (imageOnlyOf), so a card
   * of another set opened before previewCards.json landed reads 'other-set'
   * once the file holds it, though its draft isn't seeded again.
   */
  imageOnly: ImageOnlyReason | null;
  patchForm: (patch: Partial<RevealCardForm>) => void;
  validation: ValidationResult;
  /** The change list: a row per changed card key, then the staged image's. */
  changes: ChangeRow[];
  /** A changed card key or a staged image (hasEdits): what the guard and Save read. */
  dirty: boolean;
  /** The form as loaded, and no image. */
  discard: () => void;
  previewCard: LorcanaCard | null;
  synergyGroups: SynergyGroup[];
  imageName: string | null;
  /** The staged image's bytes; null while they are read, and for a file that fails its check. */
  imageDataUrl: string | null;
  /** The staged file's own error, else the validator's image error (imageErrorOf, as New reveal derives it). */
  imageError: string | null;
  /** Stage a file for this card (null clears it). Resolves once its bytes are read. */
  onImageChange: (file: File | null) => Promise<void>;
  revertImage: () => void;
  /**
   * R4-4d (R-66): every card the search can open: the cards only the branch
   * file holds, then the card list. While any card is branch-only, this array
   * and each branch-only card (lookup.card, when one is open) are new on every
   * render: key an effect on card ids, never on these.
   */
  searchCards: LorcanaCard[];
  /** R4-4d (R-66): the ids only the branch file holds, for searchCards' rows. */
  branchOnlyIds: ReadonlySet<number>;
  /** R4-4d (R-66): false while the open card is one only the branch file holds; true with none open. */
  deployed: boolean;
  /** R4-4d (R-66): reads previewCards.json again, as previewFile.reload does; R4-6b calls it once a New reveal publish lands. */
  reloadFile: () => void;
  /**
   * R4-6b: the draft's seed, bumped on every re-seed (another card, the read a
   * waiting card follows, Load it again). The Edit pane keys its form by it, so
   * a re-seeded draft opens a fresh form view (its open section, its Dual-ink
   * switch).
   */
  seed: number;
}

/** What Retry reads again: the shell's card list, and previewCards.json. */
interface RetryInput {
  list: Pick<ReturnType<typeof useCardDataContext>, 'error' | 'retryLoad'>;
  file: UsePreviewCardsFileResult;
}

/**
 * Reads again what failed: the card list (its retryLoad) and previewCards.json.
 * Resolves true once the file's re-read lands, false when the read fails, or
 * when the search shows no file error (a failed first read, or a later read's
 * reloadError). The card list's retry can't be awaited (retryLoad returns
 * nothing), so the page watches its error clear, as R3-7 does (R-59).
 */
function retryReads({list, file}: RetryInput): Promise<boolean> {
  if (list.error) list.retryLoad();
  if (previewFileView(file).error === null) return Promise.resolve(false);
  return file.reload().then((cards) => cards !== null);
}

/**
 * The draft for the card on screen. Another card, or the first read its card
 * waits for, seeds a new one during render (no effect, no ref), as
 * CardAnalyticsPage resets its own state: no frame pairs one card's form or
 * image with another card.
 */
function useEditDraft(input: {cardId: string | null; lookup: EditLookup; file: PreviewCardsFile}) {
  const [draft, setDraft] = useState<Draft>(() => seedDraft({...input, seed: 0}));
  if (needsSeed({...input, draft})) setDraft(reseeded({...input, draft}));
  return [draft, setDraft] as const;
}

/** The staged image's controls. Each acts on the upload in its own event, never during render. */
function useDraftImage(draft: Draft, setDraft: Dispatch<SetStateAction<Draft>>) {
  const upload = useImageUpload();
  return {
    staged: stagedImage({draft, upload}),
    onImageChange(image: File | null) {
      const {seed} = draft;
      setDraft((d) => stageImage(d, {seed, image}));
      return upload.choose(image);
    },
    revertImage() {
      setDraft((d) => ({...d, image: null}));
      void upload.choose(null);
    },
    discard() {
      setDraft(discardDraft);
      void upload.choose(null);
    },
    clearIf: upload.clearIf,
  };
}

/**
 * Edit card's controller (R4-4b: loading and editing; R4-4c adds saving).
 * The card comes from the shell's card list plus the cards only the branch
 * file holds (editSources, R-66), its entry and kind from previewCards.json on
 * the target branch (R-71: only a reveal-set card under a preview id waits for it), and
 * the draft from both. branchLookup refines the lookup with what only the file
 * can say: an id neither source holds waits for the file before it reads
 * missing, and a reveal-set preview card the file no longer holds is gone.
 * Every rule lives in editorState.ts and branchCards.ts; this hook is wiring.
 */
export function useCardEditor({token, cardId}: CardEditorInput): CardEditorController {
  // R4-4d (R-66): the card list with the cards only the branch file holds, and the file less allCards' ids.
  const {list, file} = editSources({list: useCardDataContext(), file: usePreviewCardsFile(token)});
  const lookup = branchLookup({lookup: editLookup({cardId, list, file}), file});
  const [draft, setDraft] = useEditDraft({cardId, lookup, file});
  const image = useDraftImage(draft, setDraft);
  const {staged} = image;
  const view = draftView(draft);
  const changes = draftChanges(draft);
  const validation = draftValidation({draft, imageName: staged.name});
  const previewCard = editPreview({card: openCard(lookup), draft, dataUrl: staged.dataUrl});

  const save = useEditSave({
    token,
    draft,
    setDraft,
    card: openCard(lookup),
    changes,
    validation,
    staged,
    clearIf: image.clearIf,
    file,
  });

  return {
    lookup,
    retry: () => retryReads({list, file}),
    previewFile: {...previewFileView(file), reload: () => void file.reload()},
    tag: openTag(lookup),
    form: view.form,
    imageOnly: imageOnlyOf({draft, lookup}),
    patchForm: (patch) => setDraft((d) => patchDraft(d, patch)),
    validation,
    changes: changeRows({loaded: view.loaded, changes, imageName: staged.name}),
    dirty: hasEdits({changes, imageName: staged.name}),
    discard: image.discard,
    previewCard,
    synergyGroups: editSynergies({preview: previewCard, draft, cards: list.cards}),
    imageName: staged.name,
    imageDataUrl: staged.dataUrl,
    imageError: imageErrorOf(staged, validation),
    onImageChange: image.onImageChange,
    revertImage: image.revertImage,
    searchCards: list.cards,
    branchOnlyIds: list.branchOnlyIds,
    deployed: deployedOf({lookup, branchOnlyIds: list.branchOnlyIds}),
    reloadFile: () => void file.reload(),
    seed: draft.seed,
    ...save,
  };
}
