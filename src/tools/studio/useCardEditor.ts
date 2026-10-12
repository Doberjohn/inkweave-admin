import {useState, type Dispatch, type SetStateAction} from 'react';
import type {LorcanaCard, SynergyGroup} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload} from '../../components/useImageUpload';
import type {RevealCardForm} from '../reveal/buildPreviewCard';
import {imageErrorOf} from '../reveal/livePreview';
import type {ValidationResult} from '../reveal/validateForm';
import {hasEdits, type ImageOnlyReason} from './cardEdit';
import {changeRows, type ChangeRow} from './changeRows';
import type {CardTag} from './editSearch';
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
import {usePreviewCardsFile} from './usePreviewCardsFile';

export interface CardEditorInput {
  /** The saved GitHub token: the studio renders the editor only under the token gate. */
  token: string;
  /** The URL's card id (?card=), or null for the search. */
  cardId: string | null;
}

export interface CardEditorController {
  /** The open card, in cardPageState's order (editorState.ts). */
  lookup: EditLookup;
  /**
   * Reads again what failed: the card list (its retryLoad) and a failed first
   * read of previewCards.json. A failed reload is read again through
   * previewFile.reload (R4-4c or R4-6b take it, addition 11).
   */
  retry: () => void;
  /** previewCards.json for the search, whatever card is open (R-71); `reload` reads it again. */
  previewFile: PreviewFileView & {reload: () => void};
  /** The open card's tag, as the search tags it (cardTag); null until it is ready. */
  tag: CardTag | null;
  /** The form now; null for an image-only card, and until the card is ready. */
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
}

/**
 * The draft for the card on screen. Another card, or the first read its card
 * waits for, seeds a new one during render (no effect, no ref), as
 * CardAnalyticsPage resets its own state: no frame pairs one card's form or
 * image with another card.
 */
function useEditDraft(input: {cardId: string | null; lookup: EditLookup; file: PreviewCardsFile}) {
  const [draft, setDraft] = useState<Draft>(() => seedDraft({...input, seed: 0}));
  if (needsSeed({...input, draft})) setDraft(seedDraft({...input, seed: draft.seed + 1}));
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
  };
}

/**
 * Edit card's controller (R4-4b: loading and editing; R4-4c adds saving).
 * The card comes from the shell's card list, its entry and kind from
 * previewCards.json on the target branch (R-71: only a card of the reveal set
 * waits for it), and the draft from both. Every rule lives in editorState.ts;
 * this hook is wiring.
 */
export function useCardEditor({token, cardId}: CardEditorInput): CardEditorController {
  const list = useCardDataContext();
  const file = usePreviewCardsFile(token);
  const lookup = editLookup({cardId, list, file});
  const [draft, setDraft] = useEditDraft({cardId, lookup, file});
  const image = useDraftImage(draft, setDraft);
  const {staged} = image;
  const view = draftView(draft);
  const changes = draftChanges(draft);
  const validation = draftValidation({draft, imageName: staged.name});
  const previewCard = editPreview({card: openCard(lookup), draft, dataUrl: staged.dataUrl});

  function retry() {
    if (list.error) list.retryLoad();
    if (file.status === 'error') void file.reload();
  }

  return {
    lookup,
    retry,
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
  };
}
