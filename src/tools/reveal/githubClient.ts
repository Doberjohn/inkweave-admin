import type {LorcanaJSONCard} from 'inkweave-synergy-engine';
import {commitCardImage, type CardImageCommit} from '../image/githubClient';
import {insertCardIntoPreviewJson} from './insertCardIntoPreviewJson';
import {EDITABLE_CARD_KEYS, replaceCardInPreviewJson, type PreviewCardChanges} from './replaceCardInPreviewJson';
import {
  commitFiles,
  readRepoFile,
  stripDataUrl,
  targetBranch,
  utf8ToBase64,
  type CommitFile,
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

/**
 * The card's entry changed on the branch since the editor loaded it, or left
 * previewCards.json. Its message ends "Load it again." Edit tells it apart with
 * instanceof, before it reduces a failure to its message (R4-4c).
 */
export class StaleCardError extends Error {
  name = 'StaleCardError';
}

/** previewCards.json's text and cards at `ref`, refusing a file with no cards array. */
async function readCardsAt({token, ref}: {token: string; ref: string}): Promise<{text: string; cards: LorcanaJSONCard[]}> {
  const text = await readRepoFile(token, PREVIEW_PATH, ref);
  let cards: unknown;
  try {
    cards = (JSON.parse(text) as {cards?: unknown} | null)?.cards;
  } catch {
    throw new Error('previewCards.json is not valid JSON');
  }
  if (!Array.isArray(cards)) throw new Error('previewCards.json has no cards array');
  return {text, cards: cards as LorcanaJSONCard[]};
}

/**
 * The cards in previewCards.json on the target branch, the entries Edit loads
 * (R4-4a). The one Edit opens is the `loaded` that commitCardEdit later checks
 * against the commit it builds on.
 */
export async function readPreviewCards(token: string): Promise<LorcanaJSONCard[]> {
  return (await readCardsAt({token, ref: targetBranch()})).cards;
}

/** What the stale check compares (R-67): every key an edit can write, and the card's identity. */
const COMPARED_KEYS: readonly (keyof LorcanaJSONCard)[] = ['id', 'setCode', 'number', ...EDITABLE_CARD_KEYS];

/** The refusal for a card that has left previewCards.json on the branch, a field save's and an image-only one's alike. */
function leftFileError(card: Pick<LorcanaJSONCard, 'fullName'>): StaleCardError {
  return new StaleCardError(`${card.fullName} is no longer in previewCards.json on ${targetBranch()}. Load it again.`);
}

/**
 * Refuses the edit with StaleCardError when the card's entry at the base commit
 * is gone, or differs from `loaded` in a key the edit could write or in its
 * identity (R-67). Keys the edit can't write, such as `variants`, may differ:
 * the edit merges into the entry as it stands there, so they come from it.
 */
function checkBaseEntry({cards, loaded}: {cards: LorcanaJSONCard[]; loaded: LorcanaJSONCard}): void {
  const base = cards.find((card) => card.id === loaded.id);
  if (!base) throw leftFileError(loaded);
  if (!COMPARED_KEYS.every((key) => JSON.stringify(base[key]) === JSON.stringify(loaded[key]))) {
    throw new StaleCardError(`${loaded.fullName} changed on ${targetBranch()} since you loaded it. Load it again.`);
  }
}

/** One preview card's edit, as Edit saves it (R4-4c). */
export interface CardEditCommit {
  token: string;
  /** The entry as the editor loaded it (readPreviewCards), or as its last save left it. */
  loaded: LorcanaJSONCard;
  /** At least one change (replaceCardInPreviewJson refuses none): a new image alone goes through commitCardImage. */
  changes: PreviewCardChanges;
  /** A staged scan: useImageUpload's data URL (or raw base64) and its extension (jpg, jpeg, png or webp). */
  image: {dataUrl: string; ext: string} | null;
}

/**
 * The commit's message (R-78), in the app history's words: it names the card
 * as the edit leaves it, says "and its image" when a scan goes with the edit,
 * and says "refresh … to its English scan" when the edit drops scanLanguage
 * (admin#14), whatever else it changes.
 */
function editMessage({loaded, changes, image}: CardEditCommit): string {
  const card = `${changes.fullName ?? loaded.fullName} (${loaded.setCode}${loaded.number})`;
  if (changes.scanLanguage === null) return `fix(reveals): refresh ${card} to its English scan`;
  return `fix(reveals): update ${card}${image ? ' and its image' : ''}`;
}

/**
 * One atomic commit on the target branch that edits a preview card's entry in
 * previewCards.json (replaceCardInPreviewJson) and, when `image` is set, adds
 * its raw scan to card-images-raw/{id}.{ext}, which convert-reveal-images
 * turns into the card's preview AVIFs.
 *
 * The file is read at the commit this one builds on, and the edit merges into
 * the entry as it stands there, so `variants` and any other key the edit can't
 * write come from the branch (R-67). Beyond a failed read and
 * replaceCardInPreviewJson's own refusals, it is refused only when the card's
 * entry changed or left the file (StaleCardError), or when the branch moves
 * between the ref read and the update (commitFiles' race, whose message ends
 * "Publish again."). Either way nothing is written. A reveal, a variants
 * commit or a convert-reveal-images commit that lands after the editor loaded
 * the card changes other entries, or keys the edit can't write, so it refuses
 * nothing.
 */
export async function commitCardEdit(opts: CardEditCommit): Promise<CommitResult> {
  const {token, loaded, changes, image} = opts;
  return commitFiles({
    token,
    message: editMessage(opts),
    files: async (baseCommitSha) => {
      const {text, cards} = await readCardsAt({token, ref: baseCommitSha});
      checkBaseEntry({cards, loaded});
      const edited = replaceCardInPreviewJson(text, {id: loaded.id, changes});
      const files: CommitFile[] = [{path: PREVIEW_PATH, contentBase64: utf8ToBase64(edited)}];
      if (image) files.push({path: `${RAW_DIR}/${loaded.id}.${image.ext}`, contentBase64: stripDataUrl(image.dataUrl)});
      return files;
    },
  });
}

/**
 * An image alone for a card under a preview id (Card studio's Edit card):
 * commitCardImage's commit, sent only while previewCards.json at the commit it
 * builds on still holds the card. One that has left the file, as graduation's
 * cards do (R-66), or an entry removed by hand, is refused with StaleCardError,
 * as commitCardEdit refuses a field save, and nothing is written: a raw scan
 * under an id the app no longer has would only convert to an orphan AVIF. A
 * released card's image goes through commitCardImage itself, which reads
 * nothing (R-71).
 */
export function commitPreviewCardImage(opts: Omit<CardImageCommit, 'atBase'>): Promise<CommitResult> {
  const {token, card} = opts;
  return commitCardImage({
    ...opts,
    atBase: (raw) => async (baseCommitSha) => {
      const {cards} = await readCardsAt({token, ref: baseCommitSha});
      if (!cards.some((entry) => String(entry.id) === card.id)) throw leftFileError(card);
      return [raw];
    },
  });
}
