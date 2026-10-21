import {ALL_CARDS_PATH, CATALOG_PATH, PROMOS_PATH, setChunkPath} from './finishFiles';

/*
 * Where a printing lives in the app's data files (#68). Every entry that holds a printing carries
 * its `finishes`, so a publish writes the value into each file that holds one (its homes). The
 * first home is the primary one: the file its value is first set in, which is also the one a
 * staged change is checked against for a clash.
 */

/** A card, one of its other printings (Enchanted, Epic, Iconic, an alt foil), or one of its promos. */
export type PrintingKind = 'card' | 'printing' | 'promo';

/** What finds a printing among the files: its id, its kind, and the card's set. */
export interface PrintingRef {
  id: string;
  kind: PrintingKind;
  /** The card's set; a promo's is its base card's, not its promo set's. */
  setCode: string;
  /** Whether that set is Core (`isCoreSet`), which puts every entry of it in allCards.json too. */
  core: boolean;
}

/**
 * The files that hold a printing besides allCards.json, which holds every Core entry: a card or a
 * printing is in its set's chunk, a promo in the catalog and promos.json. A Core card is in
 * allCards.json alone.
 */
function ownFiles({kind, setCode, core}: PrintingRef): string[] {
  switch (kind) {
    case 'card':
      return core ? [] : [setChunkPath(setCode)];
    case 'printing':
      return [setChunkPath(setCode)];
    case 'promo':
      return [CATALOG_PATH, PROMOS_PATH];
  }
}

/** Every file that holds the printing, primary home first: allCards.json comes last, unless it is the only one. */
export function homesOf(ref: PrintingRef): readonly string[] {
  const own = ownFiles(ref);
  return ref.core ? [...own, ALL_CARDS_PATH] : own;
}

/** The file where the printing's versions are first set, and where a change to them is checked. */
export function primaryHome(ref: PrintingRef): string {
  return homesOf(ref)[0];
}
