import {useState} from 'react';
import type {LorcanaCard, SynergyGroup} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload} from '../../components/useImageUpload';
import {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';
import {validateRevealCardForm, type ValidationResult} from './validateForm';
import {commitNewCard} from './githubClient';
import {buildPreview, computeSynergies} from './livePreview';
import {useGithubToken} from '../../github/useGithubToken';

const EMPTY_FORM: RevealCardForm = {
  collectorNumber: '',
  name: '',
  version: '',
  rarity: '',
  franchise: '',
  cost: '',
  ink: 'Amber',
  ink2: '',
  inkwell: true,
  type: 'Character',
  strength: '',
  willpower: '',
  lore: '',
  moveCost: '',
  subtypes: '',
  keywords: '',
  fullText: '',
  scanLanguage: 'en',
};

/** True only when the card is valid, has a token, and an image is fully read. */
function readyToPublish(p: {
  valid: boolean;
  token: string | null;
  imageFile: File | null;
  imageDataUrl: string | null;
}): boolean {
  if (!p.valid) return false;
  if (!p.token) return false;
  if (!p.imageFile) return false;
  if (!p.imageDataUrl) return false;
  return true;
}

/**
 * previewCards.json on the target branch, as Card studio reads it: its ids,
 * which the "already exists" check counts besides the live card list, and a
 * re-read after each publish, so the next one counts the card just published.
 */
export interface BranchPreviewCards {
  ids: ReadonlySet<number>;
  reload: () => void;
}

// The reveal publisher reads no branch file: it checks against the live card list alone.
const NO_BRANCH: BranchPreviewCards = {ids: new Set(), reload: () => {}};

export interface RevealAdminController {
  token: string | null;
  setToken: (t: string) => void;
  form: RevealCardForm;
  patchForm: (patch: Partial<RevealCardForm>) => void;
  previewCard: LorcanaCard | null;
  synergyGroups: SynergyGroup[];
  validation: ValidationResult;
  canPublish: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  publishError: string | null;
  onImageChange: (file: File | null) => void;
  publish: () => void;
  /** The chosen image's file name, or null. */
  imageName: string | null;
  /** The chosen image's bytes as a data URL; null until they are read. */
  imageDataUrl: string | null;
  /** Why the chosen image can't be used, or null. publishError carries it too. */
  uploadError: string | null;
  /** True once a field holds anything but the empty form's value, or an image is chosen. */
  dirty: boolean;
}

/**
 * Owns all reveal-admin page state and side effects. Keeping it here leaves the
 * page component as mostly-presentational JSX (and well under the complexity gate).
 */
export function useRevealAdmin(branch: BranchPreviewCards = NO_BRANCH): RevealAdminController {
  const {token, setToken} = useGithubToken();
  const {cards} = useCardDataContext();
  const [form, setForm] = useState<RevealCardForm>(EMPTY_FORM);
  // The chosen file and its bytes, kept in step (useImageUpload).
  const upload = useImageUpload();
  const imageFile = upload.file;
  const imageDataUrl = upload.dataUrl;
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{commitUrl: string} | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const imageName = imageFile?.name ?? null;
  const existingIds = new Set([...cards.map((c) => Number(c.id)), ...branch.ids]);
  const previewCard = buildPreview(form, imageDataUrl);
  const synergyGroups = computeSynergies(previewCard, cards);
  const validation = validateRevealCardForm(form, existingIds, imageName);
  const canPublish = readyToPublish({valid: validation.ok, token, imageFile, imageDataUrl});

  function patchForm(patch: Partial<RevealCardForm>) {
    setForm((f) => ({...f, ...patch}));
  }

  function published(res: {commitUrl: string}) {
    setResult(res);
    setForm(EMPTY_FORM);
    void upload.choose(null);
    branch.reload();
  }

  async function publish() {
    if (!token) return;
    if (!imageFile) return;
    if (!imageDataUrl) return;
    if (!validation.ok) return;
    setPublishing(true);
    setPublishError(null);
    // The last publish's commit notice would otherwise stand beside this attempt's outcome.
    setResult(null);
    try {
      const card = buildPreviewCard(form);
      const ext = (imageFile.name.split('.').pop() ?? 'png').toLowerCase();
      published(await commitNewCard({token, card, imageBase64: imageDataUrl, imageExt: ext}));
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  return {
    token,
    setToken,
    form,
    patchForm,
    previewCard,
    synergyGroups,
    validation,
    canPublish,
    publishing,
    result,
    // A file that can't be read is why Publish stays off; say so where errors show.
    publishError: publishError ?? upload.error,
    onImageChange: upload.choose,
    publish,
    imageName,
    imageDataUrl,
    uploadError: upload.error,
    dirty: JSON.stringify(form) !== JSON.stringify(EMPTY_FORM) || imageFile !== null,
  };
}
