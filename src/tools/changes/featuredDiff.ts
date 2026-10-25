import {FEATURED_INKS} from '../../app-bridge';
import {entryName} from '../featured/githubClient';

/*
 * What a commit did to featuredCardIds.json: each slot whose card it changed, by the slot's
 * ink, with the card's id and name before and after, as the Featured cards page words a save.
 */

/** A card on one side of a slot's change: its id and its full name, or null where the file had no entry there. */
export interface FeaturedSide {
  id: string;
  name: string;
}

/** One slot a commit changed. */
export interface FeaturedChange {
  /** The slot's ink, Amber to Steel, or "Slot 7" for an entry past the sixth. */
  slot: string;
  from: FeaturedSide | null;
  to: FeaturedSide | null;
}

/** A side of the file as a list of entries: none where there was no file. Throws for text that isn't a JSON list. */
function entriesIn(text: string | null): unknown[] {
  if (text === null) return [];
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('featuredCardIds.json is not a list');
  return parsed;
}

/** An entry's card: its id, and its line's full name ("Amethyst: Un Poco Loco" naming "Un Poco Loco"). */
function sideOf(entry: unknown): FeaturedSide | null {
  if (typeof entry !== 'object' || entry === null) return null;
  const {id, card} = entry as {id?: unknown; card?: unknown};
  if (id === undefined) return null;
  const line = typeof card === 'string' ? card : '';
  return {id: String(id), name: entryName({id: String(id), card: line}) || String(id)};
}

/** Each slot whose card differs between the file before the commit and after it; null sides have no file. */
export function diffFeatured({before, after}: {before: string | null; after: string | null}): FeaturedChange[] {
  const old = entriesIn(before);
  const now = entriesIn(after);
  const changes: FeaturedChange[] = [];
  for (let i = 0; i < Math.max(old.length, now.length); i++) {
    const from = sideOf(old[i]);
    const to = sideOf(now[i]);
    if (from?.id !== to?.id) changes.push({slot: FEATURED_INKS[i] ?? `Slot ${i + 1}`, from, to});
  }
  return changes;
}
