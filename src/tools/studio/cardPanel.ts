import type {LorcanaCard} from 'inkweave-synergy-engine';
import type {StudioMode} from '../../shell/nav';

/*
 * What Card studio's card panel says (R4-5d): the pill on the preview, the
 * note under a staged image and the frame's look, by mode and by what the
 * draft holds. Pure, so StudioCardPanel stays composition.
 */

/** What both file controls offer the picker. useImageUpload still reads the bytes (imageProblem). */
export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp';

/** The accepted formats, under the controls (R-89), as the image tool named them. */
export const IMAGE_FORMATS = 'JPEG, PNG or WebP.';

/** The image a draft holds: its file's name, and the error its file controls show (R-72). */
export interface StagedImage {
  name: string | null;
  error: string | null;
}

/** Nothing chosen, and no error. */
export const NO_IMAGE: StagedImage = {name: null, error: null};

/** What the panel's words turn on: the mode, and the staged image. */
export interface ImageSlot {
  mode: StudioMode;
  staged: StagedImage;
}

/** The preview's frame: no scan yet (dashed), the card's art now (solid), or a staged image (gold). */
export type FrameState = 'empty' | 'current' | 'staged';

/** A file is chosen and nothing is wrong with it, so the preview shows it. A file that failed shows its error instead. */
export function isStaged(staged: StagedImage): staged is {name: string; error: null} {
  return staged.name !== null && staged.error === null;
}

export function frameState({mode, staged}: ImageSlot): FrameState {
  if (isStaged(staged)) return 'staged';
  return mode === 'edit' ? 'current' : 'empty';
}

/**
 * The pill on the preview, in the handoff's words (R-89), offering a drop as
 * well as a click now that the controls take one (Doberjohn/inkweave-admin#54).
 * It also names the preview's file control.
 */
export function pillCaption({mode, staged}: ImageSlot): string {
  if (mode === 'edit') return 'Click or drop to replace image';
  return staged.name === null ? 'Click or drop to upload scan' : 'Click or drop to change scan';
}

/**
 * The note under a staged image (R-91 2): Edit's says when the art changes,
 * not the handoff's deploy wording, and New reveal's has its own. Null while
 * nothing is staged, or while the file's error shows in its place.
 */
export function stagedNote({mode, staged}: ImageSlot): string | null {
  if (!isStaged(staged)) return null;
  if (mode === 'edit') return `New image staged (${staged.name}). It replaces the current art when you save.`;
  return `Scan staged (${staged.name}). It's published with the card.`;
}

/**
 * A card the preview can draw: one with a name or with art. A fresh New
 * reveal form still builds a card (Amber, a Character, no name), so without
 * this the frame would show an Amber 0 where the handoff's stripes belong.
 */
export function hasPreview(card: LorcanaCard | null): card is LorcanaCard {
  if (card === null) return false;
  return card.name !== '' || card.imageUrl !== undefined;
}

/** The ids of what describes the file controls: the formats hint, and the error. */
export interface ImageNoteIds {
  hint: string;
  error: string;
}

/** A file control's aria-describedby: the error first while there is one, then the formats. */
export function fileDescription({ids, error}: {ids: ImageNoteIds; error: string | null}): string {
  return error === null ? ids.hint : `${ids.error} ${ids.hint}`;
}
