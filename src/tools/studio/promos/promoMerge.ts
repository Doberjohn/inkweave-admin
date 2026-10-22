import {collectionPromos, finishesById, mergePromoPrintings, type MergeCard, type MergeReport} from '../../../app-bridge';
import type {PromoCatalog} from './promoCatalog';

/*
 * The app's own promo merge, run over the files of the target branch (#77). An add or an edit changes
 * the owner's catalog, and `pnpm merge-promos --write` makes allCards.json and collection/promos.json
 * follow it. Card studio never edits the entries of those two files itself: it runs the app's merge,
 * bridged from scripts/lib/promo-printings.mjs, and commits the text that comes out. Both functions
 * here read the texts they are given and nothing else, and neither changes its arguments. Where the
 * catalog can't merge into the cards (a card it names isn't there, an id is already taken) the app's
 * merge throws, and so do they: the error's message says why, and nothing is returned.
 */

/** The texts of the two files the merge writes. */
export interface MergedTexts {
  allCards: string;
  promos: string;
}

/** What the merge reads: the catalog, and the branch's two files as they are. */
export interface MergeInput {
  catalog: PromoCatalog;
  files: MergedTexts;
}

/** What the merge did to one card: the promo entries it added, rewrote and removed. */
type CardChange = MergeReport['changes'][number];

/** How `outOfStep` names the promos file: its path under the app's data folder. */
const PROMOS_FILE = 'collection/promos.json';

/** The two files as the merge leaves them, and the app's report of what it did to each card. */
interface Merged {
  texts: MergedTexts;
  report: MergeReport;
}

/**
 * Runs the app's merge. allCards.json's cards take the catalog's promos, and the promos list is
 * rebuilt from the catalog. It keeps the versions its file holds for any printing the catalog names
 * none for, as the app's merge does. Each file is written in its own format: allCards.json as
 * `JSON.stringify(x, null, 2)` and a newline, promos.json as `JSON.stringify(x)` and a newline.
 */
function merged({catalog, files}: MergeInput): Merged {
  const all = JSON.parse(files.allCards) as {cards: MergeCard[]};
  const report = mergePromoPrintings(all.cards, catalog);
  const listed = collectionPromos(catalog, finishesById(JSON.parse(files.promos) as object[]));
  return {
    texts: {allCards: `${JSON.stringify(all, null, 2)}\n`, promos: `${JSON.stringify(listed)}\n`},
    report,
  };
}

/** Whether the merge changed the card's promo entries: it added, rewrote or removed one. */
function changesPromos({added, updated, removed}: CardChange): boolean {
  return added.length + updated.length + removed.length > 0;
}

/**
 * What `pnpm merge-promos --write` writes from `catalog` over `files`, in each file's format. Throws
 * where the catalog can't merge into the cards.
 */
export function mergeOver(opts: MergeInput): MergedTexts {
  return merged(opts).texts;
}

/**
 * What the merge over the files as they are would change: the full name of each card whose promo
 * entries change, in the merge report's order and each once, then 'collection/promos.json' when that
 * file's text changes. [] when the files are in step with the catalog. Throws where the catalog can't
 * merge into the cards.
 */
export function outOfStep(opts: MergeInput): string[] {
  const {texts, report} = merged(opts);
  const cards = report.changes.filter(changesPromos).map(({card}) => card.fullName);
  const names = texts.promos === opts.files.promos ? cards : [...cards, PROMOS_FILE];
  return [...new Set(names)];
}
