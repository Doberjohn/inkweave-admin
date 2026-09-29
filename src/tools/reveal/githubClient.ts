import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {insertCardIntoPreviewJson} from './insertCardIntoPreviewJson';
import {
  commitFiles,
  readRepoFile,
  stripDataUrl,
  utf8ToBase64,
  type CommitResult,
} from '../../github/githubCommit';

const PREVIEW_PATH = 'apps/web/public/data/previewCards.json';
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
