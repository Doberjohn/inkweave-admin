import type {LorcanaCard} from 'inkweave-synergy-engine';
import {commitFiles, stripDataUrl, type CommitFile, type CommitResult} from '../../github/githubCommit';

/** Where a raw scan waits for convert-reveal-images, which turns it into AVIFs and removes it. */
export const RAW_DIR = 'apps/web/public/card-images-raw';

/** The card identity fields the commit needs (a subset of LorcanaCard). */
export type ImageAdminCard = Pick<LorcanaCard, 'id' | 'fullName'>;

/** commitFiles' `files` as a callback: the files, decided at the commit this one builds on. */
export type FilesAtBase = Exclude<Parameters<typeof commitFiles>[0]['files'], CommitFile[]>;

/** A replacement scan's commit: commitCardImage's input. */
export interface CardImageCommit {
  token: string;
  card: ImageAdminCard;
  imageBase64: string; // data URL or raw base64
  imageExt: string; // jpg | jpeg | png | webp
  /**
   * Builds the commit's files around the raw scan as commitFiles' callback,
   * which reads the branch at the commit this one builds on and may refuse it
   * there: Card studio's commitPreviewCardImage does, for a card under a
   * preview id. With none, the commit reads nothing.
   */
  atBase?: (raw: CommitFile) => FilesAtBase;
}

/**
 * Commit a replacement raw scan for an existing card to
 * card-images-raw/{id}.{ext}. The convert-reveal-images workflow turns it into
 * the preview AVIFs the build already prefers, overriding the card's previous
 * image on the next deploy. No card data changes.
 */
export async function commitCardImage(opts: CardImageCommit): Promise<CommitResult> {
  const {token, card, imageExt, atBase} = opts;
  const raw: CommitFile = {path: `${RAW_DIR}/${card.id}.${imageExt}`, contentBase64: stripDataUrl(opts.imageBase64)};
  return commitFiles({
    token,
    message: `fix(card-images): update image for ${card.fullName} [${card.id}]`,
    files: atBase ? atBase(raw) : [raw],
  });
}
