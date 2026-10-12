import {useState} from 'react';
import type {LorcanaCard, SynergyGroup} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload, type ImageUpload} from '../../components/useImageUpload';
import {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';
import {EMPTY_FORM, sameForm} from './emptyForm';
import {validateRevealCardForm, type ValidationResult} from './validateForm';
import {commitNewCard} from './githubClient';
import {useGithubToken} from '../../github/useGithubToken';
import {buildPreview, computeSynergies, imageErrorOf} from './livePreview';

/** What commitNewCard needs besides the card. */
interface PublishInput {
  token: string;
  imageBase64: string;
  imageExt: string;
}

/**
 * The publish's inputs once the card is valid, a token is saved and the chosen
 * image's bytes are read; null while anything is missing. Publish is on exactly
 * when this is set. Single-condition guards keep it simple and narrow the types.
 */
function readyToPublish(p: {valid: boolean; token: string | null; upload: ImageUpload}): PublishInput | null {
  const {file, dataUrl} = p.upload;
  if (!p.valid) return null;
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
  synergyGroups: SynergyGroup[];
  validation: ValidationResult;
  /** The chosen file's name, or null. */
  imageName: string | null;
  /** The chosen file's bytes as a data URL; null while they are read, and for a file that fails its check. */
  imageDataUrl: string | null;
  /** Why the chosen file can't be used (its byte check, or a failed read), or null. */
  uploadError: string | null;
  /** The file controls' error (R-72, imageErrorOf): null until a file is chosen, then uploadError, else the validator's. */
  imageError: string | null;
  canPublish: boolean;
  publishing: boolean;
  result: {commitUrl: string} | null;
  /** The last publish's failure alone, or null; a publish clears it as it starts. */
  commitError: string | null;
  /** commitError, else uploadError: the reveal publisher's one error line. */
  publishError: string | null;
  onImageChange: (file: File | null) => void;
  publish: () => void;
}

/**
 * Owns all reveal-admin page state and side effects. Keeping it here leaves the
 * page component as mostly-presentational JSX (and well under the complexity gate).
 */
export function useRevealAdmin(): RevealAdminController {
  const {token, setToken} = useGithubToken();
  const {cards} = useCardDataContext();
  const [form, setForm] = useState<RevealCardForm>(EMPTY_FORM);
  // The chosen file and its bytes, kept in step (useImageUpload).
  const upload = useImageUpload();
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{commitUrl: string} | null>(null);
  const [commitError, setCommitError] = useState<string | null>(null);

  const imageName = upload.file?.name ?? null;
  const existingIds = new Set(cards.map((c) => Number(c.id)));
  const previewCard = buildPreview(form, upload.dataUrl);
  const synergyGroups = computeSynergies(previewCard, cards);
  const validation = validateRevealCardForm(form, existingIds, imageName);
  const ready = readyToPublish({valid: validation.ok, token, upload});

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
    synergyGroups,
    validation,
    imageName,
    imageDataUrl: upload.dataUrl,
    uploadError: upload.error,
    imageError: imageErrorOf({name: imageName, dataUrl: upload.dataUrl, error: upload.error}, validation),
    canPublish: ready !== null,
    publishing,
    result,
    commitError,
    // A file that can't be read is why Publish stays off; say so where errors show.
    publishError: commitError ?? upload.error,
    onImageChange: upload.choose,
    publish,
  };
}
