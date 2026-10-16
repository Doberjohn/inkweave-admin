import {useState} from 'react';
import type {LorcanaCard, SynergyGroup} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload, type ImageUpload} from '../../components/useImageUpload';
import {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';
import {EMPTY_FORM, sameForm} from './emptyForm';
import {validateRevealCardForm, type ValidationResult} from './validateForm';
import {releasedRevealNumbers} from './releasedNumbers';
import {commitNewCard} from './githubClient';
import {useGithubToken} from '../../github/useGithubToken';
import {cardListPending, type CardListStatus} from '../studio/readiness';
import {buildPreview, computeSynergies, imageErrorOf} from './livePreview';

/** What commitNewCard needs besides the card. */
interface PublishInput {
  token: string;
  imageBase64: string;
  imageExt: string;
}

/** What readyToPublish checks. */
interface PublishState {
  valid: boolean;
  token: string | null;
  upload: ImageUpload;
  /** The card list the number was checked against. */
  list: CardListStatus;
}

/**
 * The publish's inputs once the card is valid, checked against a loaded card
 * list, a token is saved and the chosen image's bytes are read; null while
 * anything is missing. The list fails closed: while it loads, or after it
 * failed, it holds no card, so the validator can't see a released card's
 * number (cardListPending). Publish is on exactly when this is set.
 * Single-condition guards keep it simple and narrow the types.
 */
function readyToPublish(p: PublishState): PublishInput | null {
  const {file, dataUrl} = p.upload;
  if (!p.valid) return null;
  if (cardListPending(p.list) !== null) return null;
  if (!p.token) return null;
  if (!file) return null;
  if (!dataUrl) return null;
  return {token: p.token, imageBase64: dataUrl, imageExt: (file.name.split('.').pop() ?? 'png').toLowerCase()};
}

/** The draft holds something: a field off its empty value, or a chosen file, read or not. */
function hasDraft(form: RevealCardForm, upload: ImageUpload): boolean {
  return !sameForm(form, EMPTY_FORM) || upload.file !== null;
}

export interface RevealAdminController {
  token: string | null;
  setToken: (t: string) => void;
  form: RevealCardForm;
  patchForm: (patch: Partial<RevealCardForm>) => void;
  /** The form differs from an empty one, or a file is chosen. A publish that lands clears both. */
  dirty: boolean;
  previewCard: LorcanaCard | null;
  /**
   * Runs the engine on the live preview (computeSynergies). A call, not a
   * value: StudioWorkspace runs this hook on every render in either mode, and
   * the React Compiler leaves the hook uncompiled, so a value here ran the
   * engine on every keystroke in Edit card too. New reveal's aside calls it as
   * it shows the synergies, which it does only in New reveal
   * (Doberjohn/inkweave-admin#55).
   */
  findSynergies: () => SynergyGroup[];
  validation: ValidationResult;
  /** The chosen file's name, or null. */
  imageName: string | null;
  /** The chosen file's bytes as a data URL; null while they are read, and for a file that fails its check. */
  imageDataUrl: string | null;
  /** Why the chosen file can't be used (its byte check, or a failed read), or null. */
  uploadError: string | null;
  /** The file controls' error (R-72, imageErrorOf): null until a file is chosen, then uploadError, else the validator's. */
  imageError: string | null;
  /** The card list's state: Publish waits for it to load without error, and the checklist says why (cardListPending). */
  cardList: CardListStatus;
  /**
   * Loads a failed card list again (useCardDataContext's retryLoad): New
   * reveal's "Load the card list again", which keeps the draft a page reload
   * would drop (R4-8f).
   */
  retryCardList: () => void;
  canPublish: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  /** The last publish's failure alone, or null; a publish clears it as it starts. */
  commitError: string | null;
  onImageChange: (file: File | null) => void;
  /** Commits the card; resolves once the commit has landed or failed, so a page can move focus to the outcome (R-59). */
  publish: () => Promise<void>;
}

/**
 * Owns Card studio's New reveal state and side effects. Keeping it here leaves
 * NewRevealPane as mostly-presentational JSX (and well under the complexity gate).
 */
export function useRevealAdmin(): RevealAdminController {
  const {token, setToken} = useGithubToken();
  const {cards, isLoading, error, retryLoad} = useCardDataContext();
  const cardList: CardListStatus = {isLoading, error};
  const [form, setForm] = useState<RevealCardForm>(EMPTY_FORM);
  // The chosen file and its bytes, kept in step (useImageUpload).
  const upload = useImageUpload();
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{commitUrl: string} | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const imageName = upload.file?.name ?? null;
  const existingIds = new Set(cards.map((c) => Number(c.id)));
  // A released reveal-set card holds its number under its official id, which existingIds can't match.
  const released = releasedRevealNumbers(cards);
  const previewCard = buildPreview(form, upload.dataUrl);
  const validation = validateRevealCardForm(form, existingIds, imageName, released);
  const ready = readyToPublish({valid: validation.ok, token, upload, list: cardList});

  function patchForm(patch: Partial<RevealCardForm>) {
    setForm((f) => ({...f, ...patch}));
  }

  async function publish() {
    if (!ready) return;
    setPublishing(true);
    setCommitError(null);
    // The last publish's commit notice would otherwise stand beside this attempt's outcome.
    setResult(null);
    try {
      const res = await commitNewCard({...ready, card: buildPreviewCard(form)});
      setResult(res);
      setForm(EMPTY_FORM);
      void upload.choose(null);
    } catch (e) {
      setCommitError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  return {
    token,
    setToken,
    form,
    patchForm,
    dirty: hasDraft(form, upload),
    previewCard,
    findSynergies: () => computeSynergies(previewCard, cards),
    validation,
    imageName,
    imageDataUrl: upload.dataUrl,
    uploadError: upload.error,
    imageError: imageErrorOf({name: imageName, dataUrl: upload.dataUrl, error: upload.error}, validation),
    cardList,
    retryCardList: retryLoad,
    canPublish: ready !== null,
    publishing,
    result,
    commitError,
    onImageChange: upload.choose,
    publish,
  };
}
