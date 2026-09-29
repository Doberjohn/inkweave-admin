import {useRef, useState} from 'react';
import type {LorcanaCard} from 'inkweave-synergy-engine';
import {useCardDataContext} from '../../app-bridge';
import {useImageUpload} from '../../components/useImageUpload';
import {useGithubToken} from '../../github/useGithubToken';
import {commitCardImage, type ImageAdminCard} from './githubClient';
import type {CommitResult} from '../../github/githubCommit';

const VALID_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);

function extOf(name: string): string {
  return (name.split('.').pop() ?? '').toLowerCase();
}

interface PublishPayload {
  token: string;
  card: ImageAdminCard;
  imageBase64: string;
  imageExt: string;
}

/**
 * Collapse the publish preconditions into a ready-to-commit payload, or null if
 * anything is missing. Single-condition guards keep this out of "complex
 * conditional" territory and give the caller clean type-narrowing.
 */
function toPublishPayload(inputs: {
  token: string | null;
  selectedCard: LorcanaCard | null;
  imageFile: File | null;
  newImageUrl: string | null;
}): PublishPayload | null {
  const {token, selectedCard, imageFile, newImageUrl} = inputs;
  if (!token || !selectedCard) return null;
  if (!imageFile || !newImageUrl) return null;
  const imageExt = extOf(imageFile.name);
  if (!VALID_EXT.has(imageExt)) return null;
  return {token, card: selectedCard, imageBase64: newImageUrl, imageExt};
}

export interface ImageAdminController {
  token: string | null;
  setToken: (t: string) => void;
  clearToken: () => void;
  cards: LorcanaCard[];
  selectedCard: LorcanaCard | null;
  selectCard: (card: LorcanaCard) => void;
  imageName: string | null;
  newImageUrl: string | null;
  onImageChange: (file: File | null) => void;
  canPublish: boolean;
  publishing: boolean;
  result: CommitResult | null;
  publishError: string | null;
  publish: () => void;
}

export function useImageAdmin(): ImageAdminController {
  const {token, setToken, clearToken} = useGithubToken();
  const {cards} = useCardDataContext();
  const [selectedCard, setSelectedCard] = useState<LorcanaCard | null>(null);
  // The card on screen. A publish that finishes after the operator moved on
  // clears only what it published, never a card or image picked meanwhile.
  const shownCardId = useRef<string | null>(null);
  // The chosen file and its bytes, kept in step (useImageUpload).
  const upload = useImageUpload();
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const imageFile = upload.file;
  const newImageUrl = upload.dataUrl;
  const publishPayload = toPublishPayload({token, selectedCard, imageFile, newImageUrl});
  const canPublish = publishPayload !== null;

  function selectCard(card: LorcanaCard) {
    shownCardId.current = card.id;
    setSelectedCard(card);
    // Clear any image staged for the previously selected card, so you can never
    // publish card A's upload against card B's id after switching cards.
    void upload.choose(null);
    setResult(null);
    setPublishError(null);
  }

  async function publish() {
    if (!publishPayload || !imageFile) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await commitCardImage(publishPayload);
      setResult(res);
      if (shownCardId.current === publishPayload.card.id && upload.clearIf(imageFile)) {
        shownCardId.current = null;
        setSelectedCard(null);
      }
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setPublishing(false);
    }
  }

  return {
    token,
    setToken,
    clearToken,
    cards,
    selectedCard,
    selectCard,
    imageName: imageFile?.name ?? null,
    newImageUrl,
    onImageChange: upload.choose,
    canPublish,
    publishing,
    result,
    // A file that can't be read is why Publish stays off; say so where errors show.
    publishError: publishError ?? upload.error,
    publish,
  };
}
