import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {insertCardIntoPreviewJson} from './insertCardIntoPreviewJson';
import {
  mergeCardChanges,
  previewCardsIn,
  replaceCardInPreviewJson,
  type PreviewCardChanges,
} from './replaceCardInPreviewJson';
import {
  commitFiles,
  readRepoFile,
  stripDataUrl,
  targetBranch,
  utf8ToBase64,
  type CommitFile,
  type CommitResult,
} from '../../github/githubCommit';

export const PREVIEW_PATH = 'apps/web/public/data/previewCards.json';
const RAW_DIR = 'apps/web/public/card-images-raw';

/**
 * One atomic commit on the target branch adding the card to previewCards.json
 * and its raw image to card-images-raw/. The file is read, and the duplicate-id
 * check made, at the commit this one builds on: if the branch moves meanwhile,
 * the commit is refused instead of dropping another reveal.
 *
 * The committed raw is a transient CI input, not a permanent artifact: the
 * convert-reveal-images GitHub Action converts it to AVIFs under
 * card-images-preview/ and removes the raw. See issue #420.
 */
export async function commitNewCard(opts: {
  token: string;
  card: LorcanaJSONCard;
  imageBase64: string; // data URL or raw base64
  imageExt: string; // jpg | jpeg | png | webp
}): Promise<CommitResult> {
  const {token, card, imageExt} = opts;
  const imageContent = stripDataUrl(opts.imageBase64);

  return commitFiles({
    token,
    message: `feat(reveals): add ${card.fullName} (${card.setCode}${card.number})`,
    files: async (baseCommitSha) => {
      const currentText = await readRepoFile(token, PREVIEW_PATH, baseCommitSha);
      const parsed = JSON.parse(currentText) as {cards: {id: number}[]};
      if (parsed.cards.some((c) => c.id === card.id)) {
        throw new Error(`Card id ${card.id} already exists in previewCards.json`);
      }
      return [
        {path: PREVIEW_PATH, contentBase64: utf8ToBase64(insertCardIntoPreviewJson(currentText, card))},
        {path: `${RAW_DIR}/${card.id}.${imageExt}`, contentBase64: imageContent},
      ];
    },
  });
}

/** The card moved on the branch since the editor loaded it, or left the file: load it again. */
export class StaleCardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaleCardError';
  }
}

/** previewCards.json's cards as they are on the target branch now. */
export async function readPreviewCards(token: string): Promise<LorcanaJSONCard[]> {
  return previewCardsIn(await readRepoFile(token, PREVIEW_PATH));
}

/**
 * Throws StaleCardError unless the branch's entry for the card is still the
 * one the editor loaded, as tuning's `expected` check does for a value.
 */
function checkUnchanged(cards: readonly LorcanaJSONCard[], loaded: LorcanaJSONCard): void {
  const entry = cards.find((c) => c.id === loaded.id);
  const branch = targetBranch();
  if (!entry) {
    throw new StaleCardError(`Card ${loaded.id} is no longer in previewCards.json on ${branch}. Load it again.`);
  }
  if (JSON.stringify(entry) !== JSON.stringify(loaded)) {
    throw new StaleCardError(`Card ${loaded.id} changed on ${branch} since you loaded it. Load it again.`);
  }
}

/** A staged replacement image: its bytes (a data URL or raw base64) and extension. */
export interface StagedImage {
  base64: string;
  ext: string;
}

/**
 * One commit on the target branch that edits a preview card in
 * previewCards.json, and adds its new raw scan when `image` is set. The file
 * is read, and the card checked against the entry the editor loaded, at the
 * commit this one builds on: a card that changed there, or left the file, is
 * refused with StaleCardError, so an edit never undoes another change.
 * Everything on the entry outside `changes` (its id, number and variants)
 * stays as it is. An image-only save never comes here: it goes through the
 * image tool's commitCardImage and never touches previewCards.json.
 */
export async function commitCardEdit(opts: {
  token: string;
  loaded: LorcanaJSONCard;
  changes: PreviewCardChanges;
  image: StagedImage | null;
}): Promise<CommitResult> {
  const {token, loaded, changes, image} = opts;
  const merged = mergeCardChanges(loaded, changes);
  return commitFiles({
    token,
    message: `fix(reveals): update ${merged.fullName} (${merged.setCode ?? ''}${merged.number ?? ''})`,
    files: async (baseCommitSha) => {
      const currentText = await readRepoFile(token, PREVIEW_PATH, baseCommitSha);
      checkUnchanged(previewCardsIn(currentText), loaded);
      const files: CommitFile[] = [
        {path: PREVIEW_PATH, contentBase64: utf8ToBase64(replaceCardInPreviewJson(currentText, loaded.id, changes))},
      ];
      if (image) files.push({path: `${RAW_DIR}/${loaded.id}.${image.ext}`, contentBase64: stripDataUrl(image.base64)});
      return files;
    },
  });
}
