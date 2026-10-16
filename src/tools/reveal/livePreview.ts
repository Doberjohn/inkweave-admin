import {
  synergyEngine,
  transformCard,
  type LorcanaCard,
  type SynergyGroup,
} from 'inkweave-synergy-engine';
import {visibleImageError} from '../studio/readiness';
import {buildPreviewCard, type RevealCardForm} from './buildPreviewCard';
import type {ValidationResult} from './validateForm';

// The card being written, as the studio shows it while the operator types:
// New reveal's controller (useRevealAdmin) and Edit card's (R4-4) both build on these.

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

/** The image a controller holds: New reveal's upload, or Edit card's staged file (R4-4b). */
export interface ChosenImage {
  /** The chosen file's name, or null before one is chosen. */
  name: string | null;
  /** Its bytes as a data URL, once read and checked; null otherwise. */
  dataUrl: string | null;
  /** Why the file can't be used (its byte check, or a failed read), or null. */
  error: string | null;
}

/**
 * The file controls' error (R-72), as both controllers derive it: R4-3a's
 * visibleImageError over the chosen image. Null until a file is chosen, since
 * "Upload a card image" is the checklist's; then the file's own error, else the
 * validator's.
 */
export function imageErrorOf(image: ChosenImage, validation: ValidationResult): string | null {
  return visibleImageError(validation.errors, {name: image.name, ready: image.dataUrl !== null, error: image.error});
}
