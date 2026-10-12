import {
  synergyEngine,
  transformCard,
  type LorcanaCard,
  type SynergyGroup,
} from 'inkweave-synergy-engine';
import {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';

/** Build the live preview card from form values; null until ink/type are valid. */
export function buildPreview(form: RevealCardForm, imageDataUrl: string | null): LorcanaCard | null {
  const raw = buildPreviewCard(form);
  const transformed = transformCard(raw);
  if (!transformed) return null;
  if (imageDataUrl) transformed.imageUrl = imageDataUrl;
  // The engine's transform drops it; the app's loader copies it over the same way.
  transformed.scanLanguage = raw.scanLanguage;
  return transformed;
}

/** Run the engine against the in-progress card; empty on no card or engine error. */
export function computeSynergies(card: LorcanaCard | null, allCards: LorcanaCard[]): SynergyGroup[] {
  if (!card) return [];
  try {
    return synergyEngine.findSynergies(card, allCards);
  } catch {
    return [];
  }
}
