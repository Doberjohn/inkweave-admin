import {FEATURED_COUNT, featuredIdsJson, type FeaturedEntry} from '../../app-bridge';
import {commitFiles, readRepoFile, targetBranch, utf8ToBase64, type CommitResult} from '../../github/githubCommit';

/** The homepage's six featured cards in the app repo (Doberjohn/inkweave#957): their only source. */
export const FEATURED_PATH = 'apps/web/src/features/cards/featuredCardIds.json';

const FILE_NAME = 'featuredCardIds.json';

/** One slot whose card a save changes: its ink, and the file's line before and after. */
export interface SlotChange {
  ink: string;
  from: FeaturedEntry;
  to: FeaturedEntry;
}

const isEntry = (value: unknown): value is FeaturedEntry =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FeaturedEntry).id === 'string' &&
  typeof (value as FeaturedEntry).card === 'string';

/** What is wrong with the file's parsed value, or null when it holds FEATURED_COUNT entries of {id, card}. */
function shapeProblem(parsed: unknown): string | null {
  if (!Array.isArray(parsed)) return 'is not a list';
  if (parsed.length !== FEATURED_COUNT) return `lists ${parsed.length} cards, not ${FEATURED_COUNT}`;
  const bad = parsed.findIndex((entry) => !isEntry(entry));
  return bad === -1 ? null : `entry ${bad + 1} is not {"id": "…", "card": "…"}`;
}

/** The file's entries, or an error that names the file and what is wrong with it. */
export function parseFeatured(text: string): FeaturedEntry[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${FILE_NAME} is not JSON`);
  }
  const problem = shapeProblem(parsed);
  if (problem) throw new Error(`${FILE_NAME} ${problem}`);
  return parsed as FeaturedEntry[];
}

/** The featured list on the target branch. */
export async function readFeatured(token: string): Promise<FeaturedEntry[]> {
  return parseFeatured(await readRepoFile(token, FEATURED_PATH));
}

/** A card's full name from its line, "Amethyst: Un Poco Loco" reading "Un Poco Loco". */
export function entryName({card}: FeaturedEntry): string {
  const colon = card.indexOf(': ');
  return colon === -1 ? card : card.slice(colon + 2);
}

/** The commit's message: its subject, then one line per slot it changes. */
export function featuredCommitMessage(changes: readonly SlotChange[]): string {
  const lines = changes.map(({ink, from, to}) => `${ink}: ${entryName(from)} → ${entryName(to)}`);
  return `chore(cards): change the homepage's featured cards\n\n${lines.join('\n')}\n`;
}

/** The refusal featuredFailureKind reads as 'stale', so the page offers Reload. */
export function staleFeatured(branch: string): Error {
  return new Error(`${FILE_NAME} changed on ${branch} since this page read it, so nothing was saved. Reload it and pick again.`);
}

const sameIds = (a: readonly FeaturedEntry[], b: readonly FeaturedEntry[]) =>
  a.length === b.length && a.every((entry, i) => entry.id === b[i].id);

/**
 * Writes the six entries to featuredCardIds.json in one commit on the target
 * branch. The file is read again at the commit this one builds on: if its ids
 * aren't the ones the page read (`loaded`), the save is refused rather than
 * undoing that other change. A save that changes nothing is refused by
 * commitFiles, as every tool's is.
 */
export async function commitFeatured(opts: {
  token: string;
  entries: readonly FeaturedEntry[];
  loaded: readonly FeaturedEntry[];
  changes: readonly SlotChange[];
}): Promise<CommitResult> {
  const {token, entries, loaded, changes} = opts;
  return commitFiles({
    token,
    message: featuredCommitMessage(changes),
    files: async (baseCommitSha) => {
      const current = parseFeatured(await readRepoFile(token, FEATURED_PATH, baseCommitSha));
      if (!sameIds(current, loaded)) throw staleFeatured(targetBranch());
      return [{path: FEATURED_PATH, contentBase64: utf8ToBase64(featuredIdsJson(entries))}];
    },
  });
}
